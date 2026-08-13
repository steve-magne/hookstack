#!/usr/bin/env python3
# @hookstack pre-bash-secret-detection
"""Blocks Bash commands that may contain secrets (PreToolUse)."""
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
    command = (input_data.get("tool_input") or {}).get("command") or ""
    for pattern in SECRET_PATTERNS:
        if pattern.search(command):
            return {
                "decision": "block",
                "reason": "Secret potentiel détecté dans la commande. Vérifiez avant de continuer.",
            }
    return None


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
