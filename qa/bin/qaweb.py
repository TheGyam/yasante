"""
qaweb — the only door from a test run to a web browser.

It drives the staff workspace (http://admin.localhost:5173) and the public site
(http://localhost:5173), both served from this laptop. The browser cannot reach
anything else: every request to another host is aborted and journalled, so the live
site and admin.yasante.com are out of reach by construction.

One run holds one browser with a separate window per person (`-w lead`, `-w helper`):
separate cookies, so two staff members can be signed in at once. A small server
process keeps the browser between commands (started by `qaweb start`, as a systemd
user unit so no agent shell can take it down), and records every request the pages
make, console messages and downloads.

Every command is appended to the run's journal; `qaweb step` writes the evidence
(screenshot, accessibility tree, page text, network and console since the last step),
hashes it and opens that step's section in qa/reports/<run>.md, as `qadb step` does.

Run `qaweb help` for the commands.
"""

import datetime as dt
import hashlib
import json
import os
import re
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

QA = Path(__file__).resolve().parent.parent
RUNS = QA / "runs"
ACTIVE = RUNS / ".active-web"
QADB_ACTIVE = RUNS / ".active"

STAFF = "http://admin.localhost:5173"
SITE = "http://localhost:5173"
ALLOWED_HOSTS = {"admin.localhost", "localhost", "127.0.0.1"}
ALLOWED_PORTS = {5173}
# The seed data's photos are on Unsplash's image CDN: images may load from it, nothing else.
IMAGE_HOSTS = {"images.unsplash.com"}
# Photos uploaded during a run are served by the local backend (port 8000), a different
# origin from the site, as they are in production; images may load from its /media/.
MEDIA_PORT = 8000
WINDOWS = ("lead", "helper", "visitor")
SIZES = {"desktop": (1440, 900), "laptop": (1280, 800), "phone": (390, 844)}
KEY_OK = re.compile(r"^((Control|Shift|Alt)\+)*(Enter|Escape|Tab|Backspace|Delete|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Home|End|PageUp|PageDown|Space|[a-z0-9/?])$")
ROLES = ("button", "link", "tab", "menuitem", "checkbox", "radio", "switch", "option", "combobox",
         "textbox", "searchbox", "spinbutton", "row", "listitem", "heading")
CLICK_ROLES = ("button", "link", "tab", "menuitem", "checkbox", "radio", "switch", "option", "combobox", "row")


class Refused(Exception):
    pass


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def now():
    return dt.datetime.now().isoformat(timespec="milliseconds")


def run_dir():
    if not ACTIVE.exists():
        raise Refused("no active web run: `qaweb start <run-id>` first")
    d = RUNS / ACTIVE.read_text().strip()
    d.mkdir(parents=True, exist_ok=True)
    return d


def journal(d, entry):
    with open(d / "journal.jsonl", "a") as f:
        f.write(json.dumps({"host_time": now(), "tool": "qaweb", **entry}) + "\n")


def allowed_url(url):
    if url.startswith(("data:", "blob:", "about:")):
        return True
    u = urlparse(url)
    return u.scheme in ("http", "ws") and u.hostname in ALLOWED_HOSTS and (u.port in ALLOWED_PORTS)


# ── the server: holds the browser, one page per window ─────────────────────────


class Browser:
    def __init__(self, d, headed):
        from playwright.sync_api import sync_playwright

        self.d = d
        self.pw = sync_playwright().start()
        args = ["--disable-background-networking", "--disable-component-update", "--disable-sync",
                "--no-first-run", "--disable-features=Translate,OptimizationHints,MediaRouter",
                "--password-store=basic"]
        self.browser = self.pw.chromium.launch(headless=not headed, args=args)
        self.pages = {}
        self.logs = {}  # window -> {"net": [...], "console": [...]}
        self.size = {}
        self.accept_next = set()  # windows whose next browser pop-up a plan said to accept

    def page(self, window):
        if window not in WINDOWS:
            raise Refused(f"unknown window '{window}' (have: {', '.join(WINDOWS)})")
        if window in self.pages:
            return self.pages[window]
        ctx = self.browser.new_context(viewport=dict(zip(("width", "height"), SIZES["desktop"])),
                                       accept_downloads=True, locale="en-GB", timezone_id="Europe/London")
        logs = self.logs[window] = {"net": [], "console": []}

        def guard(route):
            url = route.request.url
            u = urlparse(url)
            image = route.request.method == "GET" and route.request.resource_type == "image"
            if allowed_url(url) or (image and u.scheme == "https" and u.hostname in IMAGE_HOSTS) or (
                    image and u.scheme == "http" and u.hostname in ALLOWED_HOSTS and u.port == MEDIA_PORT
                    and u.path.startswith("/media/")):
                route.continue_()
            else:
                logs["net"].append(f"{now()} BLOCKED {route.request.method} {url[:200]}")
                journal(self.d, {"cmd": "blocked_request", "window": window, "url": url[:300]})
                route.abort()

        ctx.route("**/*", guard)
        page = ctx.new_page()

        def on_response(resp):
            u = urlparse(resp.url)
            if u.path.startswith(("/data/", "/api/", "/django-admin/")) or resp.request.resource_type == "document":
                logs["net"].append(f"{now()} {resp.request.method} {u.path}{'?' + u.query if u.query else ''} -> {resp.status}")

        def on_failed(req):
            # A request that got no answer (network error, aborted, dev-server hiccup) has
            # no response event. Without this line, an error page with no cause in
            # network.txt is unexplainable (F21). Blocked off-host requests are logged above.
            u = urlparse(req.url)
            if allowed_url(req.url) and (u.path.startswith(("/data/", "/api/", "/django-admin/"))
                                         or req.resource_type == "document"):
                logs["net"].append(f"{now()} {req.method} {u.path}{'?' + u.query if u.query else ''} "
                                   f"-> FAILED {req.failure or ''}"[:300])

        page.on("response", on_response)
        page.on("requestfailed", on_failed)
        page.on("console", lambda m: logs["console"].append(f"{now()} [{m.type}] {m.text[:500]}"))
        page.on("pageerror", lambda e: logs["console"].append(f"{now()} [pageerror] {str(e)[:500]}"))

        def on_dialog(dialog):
            accept = window in self.accept_next
            self.accept_next.discard(window)
            how = "accepted (--accept-dialog)" if accept else "dismissed by qaweb"
            logs["console"].append(f"{now()} [dialog {dialog.type}] {dialog.message[:300]} ({how})")
            journal(self.d, {"cmd": "dialog", "window": window, "type": dialog.type,
                             "message": dialog.message[:300], "accepted": accept})
            dialog.accept() if accept else dialog.dismiss()

        page.on("dialog", on_dialog)

        def on_download(dl):
            dest = self.d / "downloads"
            dest.mkdir(exist_ok=True)
            target = dest / f"{dt.datetime.now():%H%M%S}-{window}-{dl.suggested_filename}"
            dl.save_as(target)
            logs["console"].append(f"{now()} [download] {target.relative_to(QA)} sha256 {sha(target)[:16]}…")
            journal(self.d, {"cmd": "download", "window": window, "file": str(target.relative_to(self.d)), "sha256": sha(target)})

        page.on("download", on_download)
        self.pages[window] = page
        self.size[window] = "desktop"
        return page

    def pump(self):
        # The sync API only dispatches browser events (guard, dialogs, network logging) inside
        # a Playwright call. Between commands the page's requests would hang in `guard` until
        # the next one, and the app's own timeouts fire ("That took too long", F21).
        if self.pages:
            next(iter(self.pages.values())).wait_for_timeout(20)

    def close(self):
        self.browser.close()
        self.pw.stop()


def serve(run_id, headed=False):
    d = RUNS / run_id
    sock_path = d / ".qaweb.sock"
    if sock_path.exists():
        sock_path.unlink()
    b = Browser(d, headed)
    srv = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    srv.bind(str(sock_path))
    srv.listen(1)
    journal(d, {"cmd": "server_up", "headed": headed})
    srv.settimeout(0.2)
    while True:
        try:
            conn, _ = srv.accept()
        except TimeoutError:
            b.pump()
            continue
        conn.settimeout(None)
        with conn:
            data = b""
            while not data.endswith(b"\n"):
                chunk = conn.recv(65536)
                if not chunk:
                    break
                data += chunk
            try:
                req = json.loads(data)
                if req["cmd"] == "shutdown":
                    conn.sendall(json.dumps({"ok": True, "out": "browser closed"}).encode())
                    break
                out = handle(b, req["window"], req["cmd"], req["args"])
                reply = {"ok": True, "out": out}
            except Refused as e:
                reply = {"ok": False, "out": f"REFUSED: {e}"}
            except Exception as e:  # report, keep serving
                msg = str(e).split("\n")[0][:400]
                reply = {"ok": False, "out": f"ERROR: {type(e).__name__}: {msg}"}
                journal(d, {"cmd": "error", "window": req.get("window") if isinstance(req, dict) else None, "error": msg})
            conn.sendall((json.dumps(reply) + "\n").encode())
    b.close()
    srv.close()
    sock_path.unlink(missing_ok=True)


# ── commands (run inside the server) ───────────────────────────────────────────


def settle(page):
    try:
        page.wait_for_load_state("networkidle", timeout=5000)
    except Exception:
        pass
    page.wait_for_timeout(300)


def describe(loc, i):
    try:
        role, name = loc.evaluate("""e => [e.getAttribute('role') || e.tagName.toLowerCase() + (e.type ? '[' + e.type + ']' : ''),
            e.getAttribute('aria-label') || (e.labels && e.labels[0] && 'label ' + e.labels[0].innerText) || e.innerText
            || e.getAttribute('placeholder') || e.getAttribute('name') || '']""")
        if loc.evaluate("e => e.type === 'checkbox' || e.type === 'radio'"):
            name = f"{name}  ({'ticked' if loc.is_checked() else 'not ticked'})"
        elif loc.evaluate("e => 'value' in e && e.type !== 'password' && e.tagName !== 'BUTTON' && e.tagName !== 'LI'"):
            name = f"{name}  (holds {loc.input_value(timeout=1000)!r})"
    except Exception:
        role, name = "?", ""
    return f"  [{i}] {role}: {' '.join(name.split())[:100]!r}"


def candidates(page, needle, exact, roles):
    """Elements whose accessible name matches, in the order a reader meets them."""
    found = []
    for role in roles:
        loc = page.get_by_role(role, name=needle, exact=exact)
        for i in range(loc.count()):
            el = loc.nth(i)
            if el.is_visible():
                found.append(el)
    if not found:
        for loc in (page.get_by_label(needle, exact=exact), page.get_by_placeholder(needle, exact=exact),
                    page.get_by_test_id(needle), page.get_by_text(needle, exact=exact)):
            for i in range(loc.count()):
                if loc.nth(i).is_visible():
                    found.append(loc.nth(i))
            if found:
                break
    # The same element can match under two roles; keep the first.
    unique, seen = [], set()
    for el in found:
        handle = el.element_handle()
        key = handle.evaluate("e => { if (!e.__qaweb) e.__qaweb = Math.random().toString(36).slice(2); return e.__qaweb }")
        if key not in seen:
            seen.add(key)
            unique.append(el)
    return unique


def pick(page, needle, flags, roles):
    exact = "--exact" in flags
    nth = next((int(f.split("=", 1)[1]) for f in flags if f.startswith("--nth=")), None)
    role = next((f.split("=", 1)[1] for f in flags if f.startswith("--role=")), None)
    found = candidates(page, needle, exact, (role,) if role else roles)
    if not found:
        raise Refused(f"nothing on the page matches '{needle}'. Use `qaweb find` to look, or capture a step")
    if nth is None and len(found) > 1:
        listing = "\n".join(describe(el, i + 1) for i, el in enumerate(found[:15]))
        raise Refused(f"{len(found)} elements match '{needle}'; say which with --nth=N:\n{listing}")
    # qaweb counts from 1 (as `find` lists); qadb counts from 0. --nth=0 used to mean 1 here.
    if nth == 0:
        raise Refused("qaweb's --nth counts from 1, as `qaweb find` lists them (qadb's counts from 0)")
    n = nth or 1
    if not 1 <= n <= len(found):
        raise Refused(f"--nth={n} but only {len(found)} match")
    return found[n - 1]


def via_label(el):
    """A checkbox or radio drawn as a card: the input is invisible to the pointer (opacity 0 or
    pointer-events none) and its <label> takes the click, as it does for a person. Only then is
    the label clicked, because a visible label can hold links (the 18-or-over tick's Terms)."""
    styled_away = el.evaluate("""e => (e.type === 'checkbox' || e.type === 'radio') && !!e.closest('label')
        && (getComputedStyle(e).opacity === '0' || getComputedStyle(e).pointerEvents === 'none')""")
    return el.locator("xpath=ancestor::label[1]") if styled_away else None


def check_where(page):
    if not allowed_url(page.url):
        raise Refused(f"the page is at {page.url}, outside the local servers")


def handle(b, window, cmd, args):
    d = b.d
    page = b.page(window)
    flags = [a for a in args if a.startswith("--")]
    words = [a for a in args if not a.startswith("--")]
    entry = {"cmd": cmd, "window": window, "args": args}

    if cmd == "open":
        target = words[0]
        if target.startswith("/"):
            target = (SITE if "--site" in flags else STAFF) + target
        if not allowed_url(target):
            journal(d, {**entry, "refused": True})
            raise Refused("only pages on admin.localhost:5173 (staff) and localhost:5173 (site) can be opened")
        page.goto(target, wait_until="domcontentloaded")
        settle(page)
        out = f"opened {page.url} — {page.title()}"
    elif cmd in ("click", "hold"):
        check_where(page)
        el = pick(page, words[0], flags, CLICK_ROLES)
        label = describe(el, 1).split("] ", 1)[1]
        if "--accept-dialog" in flags:
            b.accept_next.add(window)
        if cmd == "hold":
            el.hover()
            page.mouse.down()
            page.wait_for_timeout(800)
            page.mouse.up()
        else:
            (via_label(el) or el).click(timeout=5000)
        settle(page)
        b.accept_next.discard(window)  # one click, one pop-up at most
        entry["hit"] = label
        out = f"clicked {label}; now at {page.url}"
    elif cmd == "fill":
        check_where(page)
        if len(words) < 2:
            raise Refused('usage: qaweb fill "<field label>" "<text>"')
        el = pick(page, words[0], flags, ("textbox", "searchbox", "spinbutton", "combobox"))
        el.fill(words[1], timeout=5000)
        try:
            got = el.input_value(timeout=1000)
        except Exception:
            got = None
        secret = (el.get_attribute("type") or "") == "password"
        if got is not None and got != words[1]:
            entry.update(readback=got, mismatch=True)
            journal(d, entry)
            raise Refused(f"TYPE_MISMATCH: the field holds {got!r}, not {words[1]!r}. Clear it and fill again; never submit it")
        entry["readback"] = "ok (password field)" if secret else "ok"
        out = f"filled {words[0]!r}: read back {'(password, length ' + str(len(got or '')) + ')' if secret else repr(got)}"
    elif cmd == "type":
        check_where(page)
        page.keyboard.type(words[0], delay=20)
        out = f"typed {len(words[0])} characters into the focused element"
    elif cmd == "press":
        check_where(page)
        if not KEY_OK.match(words[0]):
            raise Refused("keys: Enter, Escape, Tab, Backspace, Delete, arrows, Home/End, PageUp/PageDown, Space, a single letter or digit, with Control+/Shift+/Alt+")
        page.keyboard.press(words[0])
        settle(page)
        out = f"pressed {words[0]}; now at {page.url}"
    elif cmd == "select":
        check_where(page)
        el = pick(page, words[0], flags, ("combobox", "listbox"))
        chosen = el.select_option(label=words[1], timeout=5000)
        settle(page)
        out = f"selected {words[1]!r} in {words[0]!r} ({chosen})"
    elif cmd in ("check", "uncheck"):
        check_where(page)
        el = pick(page, words[0], flags, ("checkbox", "switch", "radio"))
        card = via_label(el)
        if card is None:
            el.check(timeout=5000) if cmd == "check" else el.uncheck(timeout=5000)
        elif el.is_checked() != (cmd == "check"):
            card.click(timeout=5000)
        settle(page)
        out = f"{cmd}ed {words[0]!r}: now {'on' if el.is_checked() else 'off'}"
    elif cmd == "upload":
        check_where(page)
        path = (QA / "fixtures" / words[1]).resolve()
        if not path.is_file() or (QA / "fixtures") not in path.parents:
            raise Refused("upload: only files in qa/fixtures/")
        pick(page, words[0], flags, ("button", "textbox")).set_input_files(str(path))
        settle(page)
        out = f"attached qa/fixtures/{words[1]}"
    elif cmd == "scroll":
        check_where(page)
        where = (words or ["down"])[0]
        page.evaluate({"down": "window.scrollBy(0, innerHeight*0.8)", "up": "window.scrollBy(0, -innerHeight*0.8)",
                       "top": "window.scrollTo(0,0)", "bottom": "window.scrollTo(0, document.body.scrollHeight)"}.get(where, "0"))
        page.wait_for_timeout(300)
        out = f"scrolled {where}"
    elif cmd == "wait":
        check_where(page)
        secs = float(words[1]) if len(words) > 1 else 10
        page.get_by_text(words[0], exact="--exact" in flags).first.wait_for(timeout=secs * 1000)
        out = f"'{words[0]}' is on the page"
    elif cmd == "find":
        check_where(page)
        found = candidates(page, words[0], "--exact" in flags, ROLES)
        out = f"{len(found)} match '{words[0]}':\n" + "\n".join(describe(el, i + 1) for i, el in enumerate(found[:25]))
        return out  # read-only, not journalled
    elif cmd == "url":
        return page.url
    elif cmd in ("back", "reload"):
        page.go_back() if cmd == "back" else page.reload()
        settle(page)
        out = f"{cmd}: now at {page.url}"
    elif cmd == "viewport":
        size = (words or ["desktop"])[0]
        if size not in SIZES:
            raise Refused(f"viewport: {', '.join(SIZES)}")
        w, h = SIZES[size]
        page.set_viewport_size({"width": w, "height": h})
        b.size[window] = size
        settle(page)
        out = f"viewport {size} ({w}×{h})"
    elif cmd == "step":
        return step(b, window, page, words[0], " ".join(words[1:]))
    else:
        raise Refused(f"unknown command {cmd}")
    journal(d, entry)
    return out


def step(b, window, page, step_id, note):
    if not re.fullmatch(r"[A-Za-z0-9._-]+", step_id):
        raise Refused("step-id: letters, digits, . - _ only (use the plan's step number, e.g. A03)")
    check_where(page)
    settle(page)
    d = b.d
    steps = d / "steps"
    steps.mkdir(exist_ok=True)
    n = len(list(steps.iterdir())) + 1
    sd = steps / f"{n:03d}-web-{window}-{step_id}"
    sd.mkdir()
    page.screenshot(path=sd / "screen.png", full_page=True)
    try:
        tree = page.locator("body").aria_snapshot(timeout=5000)
    except Exception as e:
        tree = f"(accessibility tree unavailable: {e})"
    (sd / "aria.txt").write_text(tree + "\n")
    text = page.locator("body").inner_text(timeout=5000)
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    (sd / "visible.txt").write_text("\n".join(lines) + "\n")
    # The summary leads with what changed: open dialogs, menus and toasts, then the page's
    # main content. The workspace's sidebar is the same on every page; it stays in visible.txt.
    shown = []
    for selector, tag in (("dialog[open], [role=dialog], [role=alertdialog]", "dialog"), ("[role=menu]", "menu"),
                          ("[role=status], [role=alert], [aria-live]", "message"), ("main", "main")):
        loc = page.locator(selector)
        for i in range(loc.count()):
            el = loc.nth(i)
            if el.is_visible():
                part = [l.strip() for l in el.inner_text(timeout=2000).splitlines() if l.strip()]
                if part and not (tag == "message" and el.locator("xpath=ancestor::main").count()):
                    shown.append(f"[{tag}]")
                    shown += part
    # The browser's own form check ("Please include an '@'…") is a bubble no screenshot shows;
    # :user-invalid holds only fields someone typed in or tried to submit.
    invalid = page.evaluate("""() => [...document.querySelectorAll(':user-invalid')].map(e =>
        ((e.labels && e.labels[0] && e.labels[0].innerText) || e.name || e.type).trim() + ': ' + e.validationMessage)""")
    if invalid:
        (sd / "invalid.txt").write_text("\n".join(invalid) + "\n")
        shown = ["[browser check]"] + invalid + shown
        lines = ["[browser check]"] + invalid + lines
    summary_lines = shown or lines
    wide = page.evaluate("() => [document.documentElement.scrollWidth, window.innerWidth]")
    logs = b.logs[window]
    net, con = logs["net"][:], logs["console"][:]
    logs["net"].clear()
    logs["console"].clear()
    (sd / "network.txt").write_text("\n".join(net) + "\n")
    (sd / "console.txt").write_text("\n".join(con) + "\n")
    (sd / "url.txt").write_text(page.url + "\n")
    files = {p.name: sha(p) for p in sorted(sd.iterdir())}
    reused = step_used(d, window, step_id)
    journal(d, {"cmd": "step", "step": step_id, "window": window, "dir": sd.name, "url": page.url,
                "viewport": b.size[window], "note": note, "sha256": files})
    bad = [l for l in net if re.search(r"-> [45]\d\d$|BLOCKED|-> FAILED (?!net::ERR_ABORTED)", l)]
    errs = [l for l in con if re.search(r"\[(error|pageerror)\]", l)]
    out = [f"== step {step_id} [web:{window}] -> {sd.relative_to(QA)}  ({now()[11:23]})",
           f"   url: {page.url}   viewport: {b.size[window]}",
           f"   screen.png sha256 {files['screen.png'][:16]}…",
           *([f"   sideways scroll: the page is {wide[0]}px wide in a {wide[1]}px window"] if wide[0] > wide[1] else []),
           "   visible text:" if not shown else "   visible text (dialogs, menus, messages, then main content; the sidebar is in visible.txt):"]
    out += [f"     | {l[:160]}" for l in summary_lines[:80]]
    if len(summary_lines) > 80:
        out.append(f"     | … {len(summary_lines) - 80} more lines in visible.txt")
    out.append(f"   requests since last step: {len(net)}, of them 4xx/5xx/failed/blocked: {len(bad)}")
    out += [f"     ! {l}" for l in bad[:15]]
    out.append(f"   console since last step: {len(con)} lines, {len(errs)} errors")
    out += [f"     ! {l[:200]}" for l in errs[:10]]
    report_step(d, f"web:{window}-{step_id}", out, reused)
    out.append(f"   report: section web:{window}-{step_id} opened in qa/reports/{d.name}.md"
               " — fill in its verdict and what you saw before the next step")
    if reused:
        out.append(f"   WARNING: step ID {step_id} was already used in window {window}; flagged in the report")
    return "\n".join(out)


def step_used(d, window, step_id):
    f = d / "journal.jsonl"
    if not f.exists():
        return False
    for line in f.read_text().splitlines():
        e = json.loads(line)
        if e.get("tool") == "qaweb" and e.get("cmd") == "step" and e.get("step") == step_id and e.get("window") == window:
            return True
    return False


def report_step(d, heading, summary, reused):
    """Same report format as qadb: the section opens with the capture summary written in."""
    sys.path.insert(0, str(QA / "bin"))
    import qadb

    qadb.report_step(d, heading, summary, reused)


# ── the client ─────────────────────────────────────────────────────────────────


def call(window, cmd, args, timeout=60):
    d = run_dir()
    sock_path = d / ".qaweb.sock"
    if not sock_path.exists():
        raise Refused("the browser isn't running for this run: `qaweb start <run-id>`")
    s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    s.settimeout(timeout)
    try:
        s.connect(str(sock_path))
    except (ConnectionRefusedError, FileNotFoundError):
        raise Refused("the browser isn't running for this run: `qaweb start <run-id>` (it reopens signed out)")
    s.sendall((json.dumps({"window": window, "cmd": cmd, "args": args}) + "\n").encode())
    data = b""
    while not data.endswith(b"\n"):
        chunk = s.recv(65536)
        if not chunk:
            break
        data += chunk
    s.close()
    reply = json.loads(data)
    if not reply["ok"]:
        raise Refused(reply["out"].removeprefix("REFUSED: "))
    return reply["out"]


def cmd_start(run_id, *flags):
    if not re.fullmatch(r"[A-Za-z0-9._-]+", run_id):
        raise Refused("run-id: letters, digits, . - _ only")
    if ACTIVE.exists() and ACTIVE.read_text().strip() != run_id:
        raise Refused(f"web run {ACTIVE.read_text().strip()} is still active: `qaweb end` it first")
    if QADB_ACTIVE.exists() and QADB_ACTIVE.read_text().strip() != run_id:
        raise Refused(f"qadb run {QADB_ACTIVE.read_text().strip()} is active; a plan that uses both must use one run ID")
    d = RUNS / run_id
    d.mkdir(parents=True, exist_ok=True)
    for url in (STAFF + "/", SITE + "/"):
        r = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "--resolve", "admin.localhost:5173:127.0.0.1",
                            "--resolve", "localhost:5173:127.0.0.1", url], capture_output=True, text=True)
        if r.stdout != "200":
            raise Refused(f"{url} answered {r.stdout or 'nothing'}: run `qa/bin/web-up {run_id}` first")
    ACTIVE.write_text(run_id)
    subprocess.run(["systemctl", "--user", "stop", "yasante-qa-browser"], capture_output=True)
    subprocess.run(["systemctl", "--user", "reset-failed", "yasante-qa-browser"], capture_output=True)
    (d / ".qaweb.sock").unlink(missing_ok=True)  # left by a browser that was stopped
    log = d / "browser.log"
    subprocess.run(["systemd-run", "--user", "--quiet", "--unit=yasante-qa-browser", "--collect",
                    f"--working-directory={QA}", "-p", f"StandardOutput=append:{log}", "-p", f"StandardError=append:{log}",
                    sys.executable, "-u", str(Path(__file__)), "serve", run_id, *(["--headed"] if "--headed" in flags else [])],
                   check=True)
    for _ in range(60):
        if (d / ".qaweb.sock").exists():
            break
        time.sleep(0.5)
    else:
        raise Refused(f"the browser did not start; see {log.relative_to(QA)}")
    journal(d, {"cmd": "start", "staff": STAFF, "site": SITE, "headed": "--headed" in flags})
    return (f"web run {run_id}: browser up ({'headed' if '--headed' in flags else 'headless'}), "
            f"windows {', '.join(WINDOWS)}; only {STAFF} and {SITE} are reachable")


def cmd_end():
    d = run_dir()
    try:
        call("lead", "shutdown", [], timeout=20)
    except Exception:
        pass
    subprocess.run(["systemctl", "--user", "stop", "yasante-qa-browser"], capture_output=True)
    journal(d, {"cmd": "end"})
    ACTIVE.unlink()
    if QADB_ACTIVE.exists() and QADB_ACTIVE.read_text().strip() == d.name:
        return "browser closed. This run also has devices: finish with `qadb end`, which hashes every file"
    manifest = {str(p.relative_to(d)): sha(p) for p in sorted(d.rglob("*"))
                if p.is_file() and p.name not in ("MANIFEST.json", "journal.jsonl", "journal.sha256") and not p.name.startswith(".")}
    (d / "MANIFEST.json").write_text(json.dumps(manifest, indent=2))
    journal(d, {"cmd": "manifest", "files": len(manifest), "journal_note": "journal hashed below"})
    (d / "journal.sha256").write_text(sha(d / "journal.jsonl") + "\n")
    return f"run closed: {len(manifest)} files hashed in {d.relative_to(QA)}/MANIFEST.json"


USAGE = {
    "start": "start <run-id> [--headed]    open the browser for this run (after qa/bin/web-up)",
    "open": "open <path> [--site]          open a staff page (/notifications) or, with --site, a public site page",
    "click": "click <text> [--exact] [--nth=N] [--role=R] [--accept-dialog]  click a button/link/tab… by its words or label;\n        --accept-dialog says OK to the browser pop-up it opens (only where a plan says so)",
    "hold": "hold <text> [...]              press and hold",
    "fill": 'fill "<field label>" "<text>"  empty a field and type into it, then read it back',
    "type": 'type "<text>"                 type into whatever has focus (code boxes, search)',
    "press": "press <key>                   Enter, Escape, Tab, Control+k, j, …",
    "select": 'select "<label>" "<option>"   choose in a drop-down',
    "check": 'check "<label>"               tick a checkbox or switch on',
    "uncheck": 'uncheck "<label>"             untick / switch off',
    "upload": 'upload "<label>" <file>       attach a file from qa/fixtures/',
    "scroll": "scroll down|up|top|bottom",
    "wait": 'wait "<text>" [seconds]       wait until text appears',
    "find": 'find "<text>"                 list matching elements (read-only)',
    "url": "url                           print the current address",
    "back": "back", "reload": "reload",
    "viewport": "viewport desktop|laptop|phone",
    "step": "step <step-id> [note]         capture evidence for a plan step",
    "end": "end                           close the browser (and the run, if it has no devices)",
}


def main(argv):
    if argv[:1] == ["serve"]:
        serve(argv[1], "--headed" in argv)
        return 0
    window = os.environ.get("QAWEB_WINDOW", "lead")
    if argv[:1] == ["-w"] and len(argv) > 1:
        window, argv = argv[1], argv[2:]
    if not argv or argv[0] not in USAGE:
        print(__doc__)
        print("Windows (people): " + ", ".join(WINDOWS) + "  — choose with -w <window>; default lead\n")
        for usage in USAGE.values():
            print("  qaweb " + usage)
        return 0 if argv[:1] in ([], ["help"], ["-h"], ["--help"]) else 2
    cmd, args = argv[0], argv[1:]
    try:
        if cmd == "start":
            print(cmd_start(*args))
        elif cmd == "end":
            print(cmd_end())
        else:
            if cmd in ("open", "fill", "type", "press", "select", "check", "uncheck", "wait", "find", "click", "hold", "upload", "step") \
                    and not [a for a in args if not a.startswith("--")]:
                raise Refused("usage: qaweb " + USAGE[cmd])
            print(call(window, cmd, args))
    except Refused as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
