#!/usr/bin/env python3
# @hookstack post-bash-cost-tracker
"""Logs Bash commands with their timestamp (PostToolUse Bash)."""
import json
import os
import sys
from datetime import datetime, timezone


def _default_append(path, content):
    with open(path, "a", encoding="utf8") as f:
        f.write(content)


def run(
    input_data=None,
    *,
    append=None,
    mkdir=None,
    project_dir=None,
    now=None,
):
    if append is None:
        append = _default_append
    if mkdir is None:
        mkdir = os.makedirs
    if project_dir is None:
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    if now is None:
        now = lambda: datetime.now(timezone.utc).isoformat()

    data = input_data or {}
    command = (data.get("tool_input") or {}).get("command") or ""
    if not command:
        return None

    log_dir = os.path.join(project_dir, ".claude", "data")
    try:
        mkdir(log_dir, exist_ok=True)
    except Exception:
        pass

    entry = {
        "ts": now(),
        "cmd": command[:500],
        "exit": (data.get("tool_response") or {}).get("exit_code"),
    }

    append(os.path.join(log_dir, "bash-history.jsonl"), json.dumps(entry) + "\n")
    return entry


if __name__ == "__main__":
    data = json.load(sys.stdin)
    run(data)
