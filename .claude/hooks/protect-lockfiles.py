#!/usr/bin/env python3
# @hookstack pre-edit-protect-lockfiles
"""Blocks direct edits of lock files (PreToolUse Write|Edit)."""
import json
import re
import sys

LOCKFILES = [
    re.compile(r"pnpm-lock\.yaml$"),
    re.compile(r"package-lock\.json$"),
    re.compile(r"yarn\.lock$"),
    re.compile(r"Gemfile\.lock$"),
    re.compile(r"poetry\.lock$"),
    re.compile(r"Pipfile\.lock$"),
    re.compile(r"composer\.lock$"),
    re.compile(r"Cargo\.lock$"),
]


def run(input_data):
    file_path = (input_data.get("tool_input") or {}).get("file_path") or ""
    if not file_path:
        return None
    for pattern in LOCKFILES:
        if pattern.search(file_path):
            return {
                "decision": "block",
                "reason": (
                    f"Lock file {file_path} must not be edited directly. Run the package manager "
                    "instead (pnpm install, npm install, cargo build…)."
                ),
            }
    return None


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
