#!/usr/bin/env python3
# @hookstack instructions-loaded-audit-log
"""Logs loaded instructions / memory to an audit file (InstructionsLoaded)."""
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
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or "."
    if now is None:
        now = lambda: datetime.now(timezone.utc).isoformat()

    log_path = os.path.join(project_dir, ".claude", "instructions-audit.log")
    try:
        mkdir(os.path.dirname(log_path), exist_ok=True)
    except Exception:
        pass

    data = input_data or {}
    line = f"{now()} | {data.get('memory_type')} | {data.get('load_reason')} | {data.get('file_path')}\n"
    append(log_path, line)
    return line


if __name__ == "__main__":
    data = json.load(sys.stdin)
    run(data)
