#!/usr/bin/env python3
# @hookstack stop-failure-log-api-errors
"""Logs API errors at failing stop (StopFailure)."""
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

    log_path = os.path.join(project_dir, ".claude", "api-errors.log")
    try:
        mkdir(os.path.dirname(log_path))
    except OSError:
        pass

    line = (
        f"{now()} | {input_data.get('error')} | "
        f"{input_data.get('error_details') or ''} | session:{input_data.get('session_id')}\n"
    )
    append(log_path, line)
    return line


if __name__ == "__main__":
    data = json.load(sys.stdin)
    run(data)
