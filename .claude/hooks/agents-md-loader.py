#!/usr/bin/env python3
# @hookstack session-start-agents-md
"""Loads AGENTS.md as additional context at session start (SessionStart)."""
import json
import os
import sys


def _read_file(path):
    with open(path, "r", encoding="utf8") as f:
        return f.read()


def _exists(path):
    return os.path.exists(path)


def run(_input=None, *, project_dir=None, read_file=None, file_exists=None):
    if read_file is None:
        read_file = _read_file
    if file_exists is None:
        file_exists = _exists
    if project_dir is None:
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR")

    if not project_dir:
        return None

    agents_path = os.path.join(project_dir, "AGENTS.md")
    if not file_exists(agents_path):
        return None

    content = read_file(agents_path)
    if not content.strip():
        return None

    return {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": content,
        }
    }


if __name__ == "__main__":
    data = json.load(sys.stdin) if not sys.stdin.isatty() else None
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
