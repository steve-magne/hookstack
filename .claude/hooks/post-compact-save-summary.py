#!/usr/bin/env python3
# @hookstack post-compact-save-summary
"""Logs the compaction summary into .claude/compaction-log.md (PostCompact)."""
import json
import os
import sys
from datetime import datetime, timezone


def _now():
    return datetime.now(timezone.utc).isoformat()


def _mkdir(path):
    os.makedirs(path, exist_ok=True)


def _append(path, content):
    with open(path, "a", encoding="utf8") as f:
        f.write(content)


def run(input_data, *, append=None, mkdir=None, project_dir=None, now=None):
    if append is None:
        append = _append
    if mkdir is None:
        mkdir = _mkdir
    if project_dir is None:
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR", ".")
    if now is None:
        now = _now

    summary = input_data.get("compact_summary") or ""
    if not summary.strip():
        return None

    log_path = os.path.join(project_dir, ".claude", "compaction-log.md")
    try:
        mkdir(os.path.dirname(log_path))
    except Exception:
        pass

    entry = f"\n## {now()} ({input_data.get('trigger') or 'auto'})\n{summary}\n"
    append(log_path, entry)
    return entry


if __name__ == "__main__":
    data = json.load(sys.stdin)
    run(data)
