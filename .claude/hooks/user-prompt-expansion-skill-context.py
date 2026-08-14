#!/usr/bin/env python3
# @hookstack user-prompt-expansion-skill-context
"""Injects additional context when certain skills are expanded (UserPromptExpansion)."""
import json
import sys

CONTEXT_MAP = {
    "code-review": (
        "Check for security vulnerabilities, adherence to SOLID principles, and the conventions in CLAUDE.md."
    ),
    "security-review": (
        "Follow OWASP Top 10. Flag hardcoded secrets, injection risks, and insecure dependencies."
    ),
}


def run(input_data=None):
    skill = (input_data or {}).get("command_name") or ""
    ctx = CONTEXT_MAP.get(skill)
    if not ctx:
        return None
    return {
        "hookSpecificOutput": {
            "hookEventName": "UserPromptExpansion",
            "additionalContext": ctx,
        },
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
