#!/usr/bin/env python3
# @hookstack pre-bash-enforce-uv
"""Blocks pip/poetry install and suggests the uv equivalent (PreToolUse Bash)."""
import json
import re
import sys

BLOCKED = [
    (re.compile(r"(^|[;&|\s`])pip\s+install\b"), "uv add"),
    (re.compile(r"(^|[;&|\s`])pip3\s+install\b"), "uv add"),
    (re.compile(r"(^|[;&|\s`])poetry\s+add\b"), "uv add"),
    (re.compile(r"(^|[;&|\s`])poetry\s+install\b"), "uv sync"),
]

# Retire le contenu des chaînes entre guillemets (arguments -m "...", --body "...")
# pour éviter les faux positifs sur des mentions documentaires.
QUOTED = re.compile(r'"(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\'')


def _strip_quoted_args(cmd):
    return QUOTED.sub('""', cmd)


def run(input_data):
    if input_data.get("tool_name") != "Bash":
        return None
    cmd = _strip_quoted_args((input_data.get("tool_input") or {}).get("command") or "")

    for pattern, fix in BLOCKED:
        if pattern.search(cmd):
            return {
                "decision": "block",
                "reason": f"Use '{fix}' instead — this project manages dependencies with uv.",
            }
    return None


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
