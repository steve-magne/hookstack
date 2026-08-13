#!/usr/bin/env python3
# @hookstack post-tool-failure-log
"""Logs tool failures for debugging (PostToolUseFailure)."""
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
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    if now is None:
        now = _now

    log_dir = os.path.join(project_dir, ".claude", "data")
    mkdir(log_dir)

    entry = {
        "ts": now(),
        "tool": input_data.get("tool_name") or "unknown",
        "input": input_data.get("tool_input") or {},
        "error": input_data.get("error") or input_data.get("tool_response"),
    }

    append(os.path.join(log_dir, "tool-failures.jsonl"), json.dumps(entry) + "\n")
    return {
        "entry": entry,
        "message": f"[post-tool-failure] Échec journalisé : {entry['tool']}\n",
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    sys.stderr.write(result["message"])
