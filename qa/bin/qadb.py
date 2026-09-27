"""
qadb — the only door from a test run to the phone.

It is the owner's personal phone. Everything here is scoped to com.yasante.app: actions
and captures are refused unless the app is in the foreground, links are limited to the
app's own URLs, and every call is appended to the run's journal with hashes of what it
captured. Nothing reads anything outside the app (no files, contacts, notifications,
other apps' screens or logs).

Run `qadb help` for the commands.
"""

import datetime as dt
import hashlib
import json
import os
import re
import shlex
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

PKG = "com.yasante.app"
QA = Path(__file__).resolve().parent.parent
RUNS = QA / "runs"
ACTIVE = RUNS / ".active"

# Windows allowed to receive a tap: the app, and Android's own permission prompt
# (the app asks for camera/notifications). Captures are allowed on the same set.
TAP_OK = {PKG, "com.google.android.permissioncontroller", "com.android.permissioncontroller"}
LINK_OK = re.compile(r"^(https://(www\.)?yasante\.com/|yasante://|exp\+yasante://)")
KEYS = {"BACK": 4, "ENTER": 66, "TAB": 61, "DEL": 67, "ESCAPE": 111}
DEV_CLIENT_URL = "exp+yasante://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8082"


class Refused(Exception):
    pass


# ── plumbing ────────────────────────────────────────────────────────────────


def adb(*args, binary=False, check=True, timeout=30):
    serial = device_serial()
    out = subprocess.run(
        ["adb", "-s", serial, *args], capture_output=True, timeout=timeout
    )
    if check and out.returncode != 0:
        raise Refused(f"adb {' '.join(args[:2])} failed: {out.stderr.decode(errors='replace').strip()}")
    return out.stdout if binary else out.stdout.decode(errors="replace")


_serial = None
# Which device a command is for: `qadb -d <alias> …`, or QADB_DEVICE=<alias>. Aliases
# (client, stylist, phone…) are fixed per run by `qadb start <run> alias=serial …`.
_alias = None


def attached():
    lines = subprocess.run(["adb", "devices"], capture_output=True, text=True).stdout.splitlines()[1:]
    return [l.split()[0] for l in lines if l.strip().endswith("device")]


def run_devices():
    f = RUNS / ACTIVE.read_text().strip() / "devices.json" if ACTIVE.exists() else None
    return json.loads(f.read_text()) if f and f.exists() else {}


def device_serial():
    global _serial
    if _serial:
        return _serial
    mapping = run_devices()
    here = attached()
    if _alias:
        serial = mapping.get(_alias) or (_alias if _alias in here else None)
        if not serial:
            raise Refused(f"no device '{_alias}' in this run (have: {', '.join(mapping) or 'none'})")
    elif len(mapping) == 1:
        serial = next(iter(mapping.values()))
    elif len(mapping) > 1:
        raise Refused(f"this run has several devices; say which with -d ({', '.join(mapping)})")
    elif len(here) == 1:
        serial = here[0]
    else:
        raise Refused(f"expected exactly one authorised device, found {len(here)}: {here}")
    if serial not in here:
        raise Refused(f"device {serial} is not connected")
    _serial = serial
    return _serial


def device_alias():
    device_serial()
    for alias, serial in run_devices().items():
        if serial == _serial:
            return alias
    return _serial


def run_dir():
    if not ACTIVE.exists():
        raise Refused("no active run: `qadb start <run-id>` first")
    d = RUNS / ACTIVE.read_text().strip()
    d.mkdir(parents=True, exist_ok=True)
    return d


def device_time():
    return adb("shell", "date '+%m-%d %H:%M:%S.000'").strip()


def journal(entry):
    entry = {"host_time": dt.datetime.now().isoformat(timespec="milliseconds"), **entry}
    if _serial and len(run_devices()) > 1:
        entry["device"] = device_alias()
    with open(run_dir() / "journal.jsonl", "a") as f:
        f.write(json.dumps(entry) + "\n")


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def foreground():
    """Package of the focused window, e.g. com.yasante.app, or a system window name."""
    out = adb("shell", "dumpsys", "window", "displays")
    m = re.search(r"mCurrentFocus=Window\{\S+ \S+ ([^/}\s]+)", out) or re.search(
        r"mFocusedApp=.*? ([a-zA-Z0-9_.]+)/", out
    )
    return m.group(1) if m else "UNKNOWN"


def require_foreground(allowed=frozenset({PKG}), what="action"):
    fg = foreground()
    if fg not in allowed:
        journal({"cmd": "REFUSED", "what": what, "foreground": fg})
        raise Refused(
            f"OUTSIDE_APP: foreground is '{fg}', not Yasante. {what} refused. "
            "Run `qadb recover`, then capture a step to show where you are."
        )
    return fg


def status_bar_height():
    out = adb("shell", "dumpsys", "window")
    m = re.search(r"type=statusBars frame=\[0,0\]\[\d+,(\d+)\]", out)
    return int(m.group(1)) if m else 160


def mask_status_bar(png):
    """Black out the status bar: its notification icons belong to the owner, not the app."""
    import io
    from PIL import Image, ImageDraw
    img = Image.open(io.BytesIO(png)).convert("RGB")
    ImageDraw.Draw(img).rectangle([0, 0, img.width, status_bar_height()], fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


def app_pid():
    return adb("shell", "pidof", PKG, check=False).strip().split(" ")[0]


# ── UI tree (app nodes only) ────────────────────────────────────────────────


def ui_tree():
    # A busy screen (blinking cursor, looping animation) never goes idle and the dump
    # fails; it often succeeds on a retry a moment later.
    for attempt in range(3):
        raw = adb("exec-out", "uiautomator", "dump", "/dev/tty", timeout=40)
        if "<?xml" in raw:
            break
        time.sleep(1.5)
    xml = raw[raw.find("<?xml") : raw.rfind("</hierarchy>") + len("</hierarchy>")]
    if not xml:
        raise Refused(f"uiautomator dump failed: {raw.strip()[:200]}")
    root = ET.fromstring(xml)
    # Keep only the app's windows; the status bar and anything else are dropped.
    kept = ET.Element("hierarchy")
    for child in list(root):
        if child.get("package") in TAP_OK:
            kept.append(child)
    return kept


def nodes(tree):
    for n in tree.iter("node"):
        b = re.findall(r"\d+", n.get("bounds", ""))
        if len(b) != 4:
            continue
        x1, y1, x2, y2 = map(int, b)
        yield {
            "text": n.get("text", ""),
            "desc": n.get("content-desc", ""),
            "id": n.get("resource-id", ""),
            "clickable": n.get("clickable") == "true",
            "focused": n.get("focused") == "true",
            "center": ((x1 + x2) // 2, (y1 + y2) // 2),
            "bounds": (x1, y1, x2, y2),
        }


def visible_text(tree):
    seen = []
    for n in nodes(tree):
        for label in (n["text"], n["desc"]):
            if label and label not in seen:
                seen.append(label)
    return seen


def match(tree, needle, exact):
    hits = []
    for n in nodes(tree):
        fields = (n["text"], n["desc"], n["id"].split("/")[-1])
        ok = any((f == needle) if exact else (needle.lower() in f.lower()) for f in fields if f)
        if ok:
            hits.append(n)
    # A button and its own label/icon are nested nodes: keep one, the clickable one.
    merged = []
    for h in sorted(hits, key=lambda h: not h["clickable"]):
        inside = lambda pt, b: b[0] <= pt[0] <= b[2] and b[1] <= pt[1] <= b[3]
        if not any(inside(h["center"], m["bounds"]) or inside(m["center"], h["bounds"]) for m in merged):
            merged.append(h)
    return sorted(merged, key=lambda h: (h["center"][1], h["center"][0]))


# ── commands ────────────────────────────────────────────────────────────────


def cmd_start(run_id, *pairs):
    """start <run> for one device; start <run> client=emulator-5554 stylist=emulator-5556 for several."""
    global _serial
    if not re.fullmatch(r"[A-Za-z0-9_-]+", run_id):
        raise Refused("run-id: letters, digits, - and _ only")
    RUNS.mkdir(exist_ok=True)
    ACTIVE.write_text(run_id)
    d = run_dir()
    mapping = {}
    for pair in pairs:
        alias, _, serial = pair.partition("=")
        if not re.fullmatch(r"[a-z][a-z0-9]*", alias) or not serial:
            raise Refused(f"device pairs look like client=emulator-5554, not {pair!r}")
        mapping[alias] = serial
    if not mapping:
        here = attached()
        if len(here) != 1:
            raise Refused(f"{len(here)} devices attached; name them: start {run_id} client=<serial> stylist=<serial>")
        mapping = {"phone" if not here[0].startswith("emulator-") else "emu": here[0]}
    (d / "devices.json").write_text(json.dumps(mapping, indent=2))
    for alias, serial in mapping.items():
        _serial = None
        globals()["_alias"] = alias
        start_one(d, alias, serial)
    globals()["_alias"] = None
    _serial = None


def start_one(d, alias, serial):
    if serial not in attached():
        raise Refused(f"{alias}: device {serial} is not connected")
    pkg = adb("shell", "dumpsys", "package", PKG)
    if "versionName" not in pkg:
        raise Refused(f"{PKG} is not installed on the device")
    info = {
        "serial": device_serial(),
        "model": adb("shell", "getprop", "ro.product.model").strip(),
        "android": adb("shell", "getprop", "ro.build.version.release").strip(),
        "app_version": re.search(r"versionName=(\S+)", pkg).group(1),
        "app_version_code": (re.search(r"versionCode=(\d+)", pkg) or [None, None])[1],
        "dev_client": "devlauncher" in pkg.lower(),
        "device_time": device_time(),
    }
    # Phone port 8765, not 8000: something on the owner's phone already holds 8000.
    adb("reverse", "tcp:8765", "tcp:8000")
    # Metro runs on 8082 (8081 is taken on the laptop) and hands out 8082 URLs, so the
    # phone must reach 8082 as-is; 8081 is forwarded too for the dev client's default.
    adb("reverse", "tcp:8082", "tcp:8082")
    adb("reverse", "tcp:8081", "tcp:8082")
    info["alias"] = alias
    (d / f"device-{alias}.json").write_text(json.dumps(info, indent=2))
    if len(run_devices()) == 1:
        (d / "device.json").write_text(json.dumps(info, indent=2))
    journal({"cmd": "start", **info})
    print(json.dumps(info, indent=2))
    if not info["dev_client"]:
        print(
            "WARNING: this build is not a dev client. It has its API address built in "
            "(the live server), so it cannot be pointed at the local backend. STOP and report."
        )


def cmd_launch():
    """Open the app. A dev client is pointed at local Metro; a plain build just starts."""
    d = run_dir()
    f = d / f"device-{device_alias()}.json"
    info = json.loads((f if f.exists() else d / "device.json").read_text())
    if info["dev_client"]:
        adb("shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", DEV_CLIENT_URL, PKG)
    else:
        adb("shell", "monkey", "-p", PKG, "-c", "android.intent.category.LAUNCHER", "1")
    journal({"cmd": "launch", "dev_client": info["dev_client"]})
    print("launched; wait for the bundle to load, then `qadb step`")


def cmd_recover():
    adb("shell", "am", "start", "-a", "android.intent.action.MAIN",
        "-c", "android.intent.category.LAUNCHER", "-p", PKG)
    time.sleep(1)
    fg = foreground()
    journal({"cmd": "recover", "foreground_after": fg})
    print(f"foreground now: {fg}")


def cmd_stop():
    adb("shell", "am", "force-stop", PKG)
    journal({"cmd": "stop"})
    print("app stopped")


def cmd_clear():
    """Wipes Yasante's own data on the phone (signed out, first-run state). Nothing else."""
    adb("shell", "pm", "clear", PKG)
    journal({"cmd": "clear"})
    print("app data cleared")


def cmd_link(url):
    if not LINK_OK.match(url):
        raise Refused("links are limited to https://yasante.com/…, yasante://… and exp+yasante://…")
    adb("shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", shlex.quote(url), PKG)
    journal({"cmd": "link", "url": url})
    print(f"opened {url} in {PKG}")


def cmd_tap(x, y):
    fg = require_foreground(TAP_OK, "tap")
    adb("shell", "input", "tap", str(int(x)), str(int(y)))
    journal({"cmd": "tap", "x": int(x), "y": int(y), "foreground": fg})
    print(f"tapped {x},{y}")


def cmd_tapon(needle, *flags):
    fg = require_foreground(TAP_OK, "tapon")
    exact = "--exact" in flags
    nth = next((int(f.split("=")[1]) for f in flags if f.startswith("--nth=")), None)
    hits = match(ui_tree(), needle, exact)
    if not hits:
        raise Refused(f"no element matching '{needle}' on screen. Capture a step and look.")
    if len(hits) > 1 and nth is None:
        listing = "\n".join(f"  [{i}] {h['text'] or h['desc'] or h['id']} @ {h['center']}" for i, h in enumerate(hits))
        raise Refused(f"{len(hits)} elements match '{needle}'; pick one with --nth=N:\n{listing}")
    h = hits[nth or 0]
    adb("shell", "input", "tap", *map(str, h["center"]))
    journal({"cmd": "tapon", "needle": needle, "hit": h["text"] or h["desc"] or h["id"], "at": h["center"], "foreground": fg})
    print(f"tapped '{h['text'] or h['desc'] or h['id']}' at {h['center']}")


def focused_field():
    try:
        for n in ui_tree().iter("node"):
            if n.get("focused") == "true" and "EditText" in n.get("class", ""):
                return n
    except (Refused, ET.ParseError):
        pass
    return None


def cmd_type(text):
    """Types in small pieces (a controlled input dropped or reordered characters when a whole
    string arrived at once), then reads the field back and says if it doesn't match."""
    require_foreground({PKG}, "type")
    if not text.isascii():
        raise Refused("only ASCII can be typed through adb input")
    if not text:
        raise Refused("nothing to type: the text is empty (did a command before this print nothing?)")
    time.sleep(0.4)  # let a field that was just tapped take focus
    for i in range(0, len(text), 4):
        adb("shell", "input", "text", shlex.quote(text[i:i + 4].replace(" ", "%s")))
        time.sleep(0.12)
    field = focused_field()
    got = field.get("text", "") if field is not None else None
    secret = field is not None and field.get("password") == "true"
    if got is None or secret:
        verdict = "not checked (UI tree unavailable)" if got is None else "not checked (password field)"
    elif got.endswith(text):
        verdict = "field reads back correctly"
    else:
        journal({"cmd": "type", "text": text, "readback": got, "mismatch": True})
        raise Refused(
            f"TYPE_MISMATCH: typed {text!r} but the field now reads {got!r}. "
            "Do not submit. Run `qadb clearfield`, then type it again."
        )
    journal({"cmd": "type", "text": text, "readback": verdict})
    print(f"typed {text!r}: {verdict}")


def cmd_clearfield():
    """Empties the focused field: select all, delete."""
    require_foreground({PKG}, "clearfield")
    adb("shell", "input", "keycombination", "113", "29")  # CTRL+A
    adb("shell", "input", "keyevent", "67")
    field = focused_field()
    left = field.get("text", "") if field is not None else "?"
    journal({"cmd": "clearfield", "left": left})
    print(f"cleared; field now reads {left!r}" if left != "?" else "cleared (UI tree unavailable to confirm)")


def cmd_key(name):
    name = name.upper()
    if name not in KEYS:
        raise Refused(f"keys: {', '.join(KEYS)}")
    require_foreground(TAP_OK, f"key {name}")
    adb("shell", "input", "keyevent", str(KEYS[name]))
    journal({"cmd": "key", "key": name})
    print(f"pressed {name}")


def cmd_swipe(direction):
    require_foreground({PKG}, "swipe")
    w, h = map(int, re.findall(r"(\d+)x(\d+)", adb("shell", "wm", "size"))[-1])
    cx, cy = w // 2, h // 2
    d = {"up": (cx, int(h * .75), cx, int(h * .25)), "down": (cx, int(h * .25), cx, int(h * .75)),
         "left": (int(w * .8), cy, int(w * .2), cy), "right": (int(w * .2), cy, int(w * .8), cy)}
    if direction not in d:
        raise Refused("swipe up|down|left|right  (up scrolls the content up, i.e. shows more below)")
    adb("shell", "input", "swipe", *map(str, d[direction]), "300")
    journal({"cmd": "swipe", "dir": direction})
    print(f"swiped {direction}")


def cmd_find(needle):
    require_foreground(TAP_OK, "find")
    hits = match(ui_tree(), needle, False)
    for h in hits:
        print(json.dumps(h))
    print(f"{len(hits)} match(es)")


def cmd_fg():
    fg = foreground()
    journal({"cmd": "fg", "foreground": fg})
    print(fg)


def cmd_step(step_id, *note):
    """Evidence for one step: screenshot, app UI tree, visible text, app log since last step."""
    if not re.fullmatch(r"[A-Za-z0-9._-]+", step_id):
        raise Refused("step-id: letters, digits, . - _ only (use the plan's step number, e.g. S03)")
    fg = require_foreground(TAP_OK, "capture")
    d = run_dir()
    steps = d / "steps"
    steps.mkdir(exist_ok=True)
    n = len(list(steps.iterdir())) + 1
    tag = f"{device_alias()}-" if len(run_devices()) > 1 else ""
    sd = steps / f"{n:03d}-{tag}{step_id}"
    sd.mkdir()

    png = adb("exec-out", "screencap", "-p", binary=True)
    if foreground() != fg:  # the screen changed hands mid-capture: don't keep it
        raise Refused("foreground changed during capture; screenshot discarded, capture again")
    (sd / "screen.png").write_bytes(mask_status_bar(png))

    texts, ids, ui_error = [], [], None
    try:
        tree = ui_tree()
        ET.ElementTree(tree).write(sd / "ui.xml", encoding="unicode")
        texts = visible_text(tree)
        ids = [n["id"] for n in nodes(tree) if n["id"] and ":id/" not in n["id"]]
    except (Refused, ET.ParseError) as e:
        ui_error = str(e)
    (sd / "visible.txt").write_text("\n".join(texts) + "\n")

    since_file = d / f".log_since-{device_alias()}"
    since = since_file.read_text() if since_file.exists() else None
    now = device_time()
    pid = app_pid()
    log = ""
    if pid:
        args = ["logcat", "-d", "-v", "time", f"--pid={pid}"] + (["-T", since] if since else ["-t", "300"])
        log = adb(*args, check=False, timeout=20)
    (sd / "app.log").write_text(log)
    since_file.write_text(now)

    files = {p.name: sha(p) for p in sorted(sd.iterdir())}
    entry = {"cmd": "step", "step": step_id, "dir": sd.name, "device_time": now,
             "foreground": fg, "note": " ".join(note), "sha256": files, "ui_error": ui_error}
    reused = step_used(d, step_id)
    journal(entry)
    out = [f"== step {step_id} [{device_alias()}] -> {sd.relative_to(QA)}  (device time {now})",
           f"   screen.png sha256 {files['screen.png'][:16]}…"]
    if ui_error:
        out.append(f"   UI tree unavailable: {ui_error}")
    if ids:
        out.append(f"   testIDs (tapon targets): {', '.join(ids)}")
    out.append("   visible text:")
    out += [f"     | {t}" for t in texts]
    errs = [l for l in log.splitlines() if re.search(r"\b(E|F)/|Error|Exception|Warning", l)]
    out.append(f"   app log: {len(log.splitlines())} lines, {len(errs)} error/warning lines")
    out += [f"     ! {l[:200]}" for l in errs[:15]]
    print("\n".join(out))
    report_step(d, f"{tag}{step_id}", out, reused)
    print(f"   report: section {tag}{step_id} opened in {report_path(d).relative_to(QA)}"
          " — fill in its verdict and what you saw before the next step")
    if reused:
        print(f"   WARNING: step ID {step_id} was already used on this device; flagged in the report")


def step_used(d, step_id):
    """True if this device already captured a step with this ID in this run."""
    f = d / "journal.jsonl"
    if not f.exists():
        return False
    alias = device_alias() if len(run_devices()) > 1 else None
    for line in f.read_text().splitlines():
        e = json.loads(line)
        if e.get("cmd") == "step" and e.get("step") == step_id and e.get("device") == alias:
            return True
    return False


def report_path(d):
    return QA / "reports" / f"{d.name}.md"


def report_step(d, heading, summary, reused):
    """Opens the step's section in qa/reports/<run>.md, with the capture summary written in
    verbatim, so the report grows as the run goes and can't be rewritten from memory. The
    executor fills in the verdict, the checks and what it saw."""
    rep = report_path(d)
    text = rep.read_text() if rep.exists() else ""
    if not text.strip():
        tpl = (QA / "reports" / "TEMPLATE.md").read_text()
        plan = d.name.rsplit("-", 2)[0]
        head = tpl.split("## Steps")[0].replace("<RUN>", d.name).replace("<PLAN>", plan)
        text = head + "## Steps\n\n" + tpl[tpl.index("## Other observations"):]
    flag = ("**qadb:** this step ID was already used on this device. Say why it was "
            "captured again, and use a suffix (`S07b`) next time.\n\n") if reused else ""
    section = (f"### {heading}\n**Verdict:** \n\n{flag}"
               "`qadb step` output (written by qadb; do not edit):\n```\n"
               + "\n".join(summary) + "\n```\n\n"
               "Checks (server / db / mailbox commands and raw output, pasted):\n```\n```\n\n"
               "Observed vs expected:\n\n---\n\n")
    marker = "## Other observations"
    at = text.find(marker, text.find("## Steps"))
    text = text[:at] + section + text[at:] if at >= 0 else text.rstrip("\n") + "\n\n" + section
    rep.write_text(text)


def cmd_end():
    d = run_dir()
    global _serial
    for serial in run_devices().values() or [None]:
        if serial in attached():
            _serial = serial
            adb("reverse", "--remove-all", check=False)
    _serial = None
    manifest = {str(p.relative_to(d)): sha(p) for p in sorted(d.rglob("*"))
                if p.is_file() and p.name not in ("MANIFEST.json", "journal.jsonl")}
    (d / "MANIFEST.json").write_text(json.dumps(manifest, indent=2))
    journal({"cmd": "end", "files": len(manifest), "journal_note": "journal hashed below"})
    (d / "journal.sha256").write_text(sha(d / "journal.jsonl") + "\n")
    ACTIVE.unlink()
    print(f"run closed: {len(manifest)} files hashed in {d.relative_to(QA)}/MANIFEST.json")


COMMANDS = {
    "start": (cmd_start, "start <run-id> [alias=serial …]  pin the device(s), record them, set up port forwarding"),
    "launch": (cmd_launch, "launch                    open Yasante (dev client -> local Metro)"),
    "recover": (cmd_recover, "recover                   bring Yasante back to the front"),
    "stop": (cmd_stop, "stop                      force-stop Yasante"),
    "clear": (cmd_clear, "clear                     wipe Yasante's own data (fresh install state)"),
    "link": (cmd_link, "link <url>                open a yasante.com / yasante:// link in the app"),
    "tap": (cmd_tap, "tap <x> <y>               tap a point (app or its permission prompt only)"),
    "tapon": (cmd_tapon, "tapon <text> [--exact] [--nth=N]  tap the element with that text/label/testID"),
    "type": (cmd_type, "type <text>               type into the focused field (ASCII)"),
    "clearfield": (cmd_clearfield, "clearfield                empty the focused field"),
    "key": (cmd_key, "key BACK|ENTER|TAB|DEL|ESCAPE"),
    "swipe": (cmd_swipe, "swipe up|down|left|right"),
    "find": (cmd_find, "find <text>               list on-screen elements matching text"),
    "fg": (cmd_fg, "fg                        print the foreground package"),
    "step": (cmd_step, "step <step-id> [note]     capture evidence for a plan step"),
    "end": (cmd_end, "end                       close the run and hash every file"),
}


def main(argv):
    global _alias
    _alias = os.environ.get("QADB_DEVICE") or None
    if argv[:1] == ["-d"] and len(argv) > 1:
        _alias, argv = argv[1], argv[2:]
    if not argv or argv[0] in ("help", "-h", "--help") or argv[0] not in COMMANDS:
        print(__doc__)
        for _, (_, usage) in COMMANDS.items():
            print("  qadb " + usage)
        return 0 if argv[:1] in ([], ["help"], ["-h"], ["--help"]) else 2
    fn, _ = COMMANDS[argv[0]]
    try:
        fn(*argv[1:])
    except Refused as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        return 3
    except TypeError:
        print("usage: qadb " + COMMANDS[argv[0]][1], file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
