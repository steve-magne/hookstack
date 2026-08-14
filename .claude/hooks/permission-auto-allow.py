#!/usr/bin/env python3
# @hookstack permission-request-auto-allow-readonly
"""Auto-allows read-only tools and safe Bash commands (PermissionRequest)."""
import json
import re
import sys

SAFE_BASH = [
    re.compile(r"^ls"),
    re.compile(r"^pwd"),
    re.compile(r"^echo"),
    re.compile(r"^cat(?!.*>)"),
    re.compile(r"^head"),
    re.compile(r"^tail"),
    re.compile(r"^wc"),
    re.compile(r"^which"),
    re.compile(r"^whereis"),
    re.compile(r"^file"),
    re.compile(r"^stat"),
    re.compile(r"^git\s+(status|log|diff|show|branch|tag)"),
    re.compile(r"^npm\s+(list|ls|outdated|view)"),
]

READ_ONLY_TOOLS = ["Read", "Glob", "Grep"]


def run(input_data=None):
    data = input_data or {}
    tool_name = data.get("tool_name") or ""
    tool_input = data.get("tool_input") or {}

    allow = tool_name in READ_ONLY_TOOLS
    if not allow and tool_name == "Bash":
        cmd = (tool_input.get("command") or "").strip()
        allow = any(p.search(cmd) for p in SAFE_BASH)

    if not allow:
        return None
    return {
        "hookSpecificOutput": {
            "hookEventName": "PermissionRequest",
            "decision": {"behavior": "allow"},
        },
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
