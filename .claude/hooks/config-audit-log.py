#!/usr/bin/env python3
# @hookstack config-change-audit-log
"""Logs Claude Code config changes (ConfigChange)."""
import json
import os
import sys
from datetime import datetime, timezone


def _now():
    return datetime.now(timezone.utc).isoformat()


def _mkdir(path, **kwargs):
    os.makedirs(path, exist_ok=True)


def _append(path, line):
    with open(path, "a", encoding="utf8") as f:
        f.write(line)


def run(
    input_data,
    *,
    append=None,
    mkdir=None,
    home=None,
    project_dir=None,
    now=None,
):
    if append is None:
        append = _append
    if mkdir is None:
        mkdir = _mkdir
    if home is None:
        home = os.path.expanduser("~")
    if now is None:
        now = _now

    log_dir = os.path.join(home, ".claude")
    mkdir(log_dir)

    project = project_dir.rstrip("/").split("/")[-1] or "unknown" if project_dir else "unknown"
    entry = {
        "ts": now(),
        "project": project,
        "change": input_data.get("change", input_data),
    }

    append(os.path.join(log_dir, "config-changes.jsonl"), json.dumps(entry) + "\n")
    return {"entry": entry, "message": "[config-audit] Changement journalise.\n"}


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    sys.stderr.write(result["message"])
