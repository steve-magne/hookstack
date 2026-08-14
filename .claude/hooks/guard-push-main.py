#!/usr/bin/env python3
# @hookstack pre-bash-guard-git-push-main
"""Blocks git push --force to main/master (PreToolUse Bash)."""
import json
import re
import sys

FORCE_RE = re.compile(r"git\s+push\b.*--force(?:-with-lease)?|git\s+push\b.*-f\b")
MAIN_RE = re.compile(r"\b(main|master)\b")


def run(input_data):
    command = (input_data.get("tool_input") or {}).get("command") or ""
    is_force = bool(FORCE_RE.search(command))
    is_main = bool(MAIN_RE.search(command))

    if is_force and is_main:
        return {
            "decision": "block",
            "reason": "Force-push vers main/master interdit. Créez une PR ou demandez confirmation explicite.",
        }
    return None


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
