#!/usr/bin/env python3
# @hookstack permission-request-auto-allow-exit-plan
"""Auto-allows exiting plan mode (PermissionRequest)."""
import json
import sys


def run(input_data=None):
    tool_name = (input_data or {}).get("tool_name") or (input_data or {}).get("tool") or ""
    if tool_name != "exit_plan_mode":
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
