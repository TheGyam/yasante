"""
mailbox <run-id> [--to ADDRESS] [--last]

Lists the emails the local backend "sent" (Django's console backend prints them into
qa/runs/<run-id>/server.log): time order, recipient, subject, and the code or reset link
each one carries. Read-only. This is the only sanctioned way to get a code or a link.
"""

import re
import sys
from pathlib import Path

QA = Path(__file__).resolve().parent.parent


def emails(log):
    # The console backend ends each email with a line of 79 dashes. Split on it, then start
    # at the first Content-Type (plain-text-only emails, like the data export, have no
    # multipart header).
    for chunk in re.split(r"\n-{79}\n", log):
        start = re.search(r"^Content-Type: ", chunk, re.M)
        if not start:
            continue
        chunk = chunk[start.start():]
        head = chunk[:2000]
        if not re.search(r"^Subject: ", head, re.M):
            continue
        subject = re.search(r"^Subject: (.*)$", head, re.M)
        to = re.search(r"^To: (.*)$", head, re.M)
        date = re.search(r"^Date: (.*)$", head, re.M)
        code = re.match(r"(\d{6}) is your Yasante code", subject.group(1)) if subject else None
        link = re.search(r"https://yasante\.com/auth/reset-password\?uid=[\w-]+&token=[\w-]+", chunk)
        yield {
            "date": date.group(1) if date else "?",
            "to": to.group(1).strip() if to else "?",
            "subject": subject.group(1).strip() if subject else "?",
            "code": code.group(1) if code else None,
            "link": link.group(0) if link else None,
        }


def main(argv):
    if not argv or argv[0].startswith("-"):
        print(__doc__)
        return 2
    log = QA / "runs" / argv[0] / "server.log"
    if not log.exists():
        print(f"no server log at {log}")
        return 1
    to = argv[argv.index("--to") + 1].lower() if "--to" in argv else None
    found = [m for m in emails(log.read_text(errors="replace")) if not to or m["to"].lower() == to]
    if "--last" in argv:
        found = found[-1:]
    for i, m in enumerate(found, 1):
        print(f"[{i}] {m['date']} | to {m['to']} | {m['subject']}")
        if m["code"]:
            print(f"     code: {m['code']}")
        if m["link"]:
            print(f"     link: {m['link']}")
    print(f"{len(found)} email(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
