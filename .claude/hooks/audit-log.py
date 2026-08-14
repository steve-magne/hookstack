#!/usr/bin/env python3
# @hookstack session-end-audit-log
"""Records a session summary to ~/.claude/audit-log.jsonl (SessionEnd)."""
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
        "timestamp": now(),
        "project": project,
        "session_id": input_data.get("session_id"),
        "total_cost_usd": input_data.get("total_cost_usd"),
        "num_turns": input_data.get("num_turns"),
    }

    append(os.path.join(log_dir, "audit-log.jsonl"), json.dumps(entry) + "\n")
    return entry


if __name__ == "__main__":
    data = json.load(sys.stdin)
    run(data)
