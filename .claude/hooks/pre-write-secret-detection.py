#!/usr/bin/env python3
# @hookstack pre-write-secret-detection
"""Blocks file writes containing potential secrets (PreToolUse Write|Edit)."""
import json
import re
import sys

SECRET_PATTERNS = [
    re.compile(r"(?:ANTHROPIC|OPENAI|CLAUDE|GEMINI|GROQ)_API_KEY\s*=\s*['\"]?\S{20,}", re.I),
    re.compile(r"sk-(?:ant-|proj-)?[a-zA-Z0-9_-]{32,}"),
    re.compile(r"ghp_[a-zA-Z0-9]{36}"),
    re.compile(r"-----BEGIN (?:RSA |EC )?PRIVATE KEY"),
    re.compile(r"(?:password|passwd|secret|token)\s*=\s*['\"][^'\"]{6,}", re.I),
]


def run(input_data):
    tool_input = input_data.get("tool_input") or {}
    content = tool_input.get("content") or tool_input.get("new_string") or ""
    if not content:
        return None

    for pattern in SECRET_PATTERNS:
        if pattern.search(content):
            return {
                "decision": "block",
                "reason": (
                    "[secret-detection] Potential secret in the content being written. Reference it via an "
                    "environment variable or .env (gitignored) instead of hardcoding it."
                ),
            }
    return None


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
