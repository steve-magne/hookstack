#!/usr/bin/env python3
# @hookstack permission-denied-auto-mode-log
"""Logs denied permissions (PermissionDenied)."""
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
    project_dir=None,
    now=None,
):
    if append is None:
        append = _append
    if mkdir is None:
        mkdir = _mkdir
    if project_dir is None:
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or "."
    if now is None:
        now = _now

    log_path = os.path.join(project_dir, ".claude", "permission-denied.log")
    try:
        mkdir(os.path.dirname(log_path))
    except OSError:
        pass

    line = (
        f"{now()} | {input_data.get('tool_name')} | "
        f"{json.dumps(input_data.get('tool_input'))} | {input_data.get('reason')}\n"
    )
    append(log_path, line)
    return line


if __name__ == "__main__":
    data = json.load(sys.stdin)
    run(data)
