#!/usr/bin/env python3
# @hookstack message-display-redact-secrets
"""Redacts secrets in the displayed content (MessageDisplay)."""
import json
import re
import sys

_ANTHROPIC = re.compile(r"sk-(?:ant-api03-|proj-)[A-Za-z0-9_-]{20,}")
_API_KEY = re.compile(r"sk-[A-Za-z0-9]{20,}")
_GH_PAT = re.compile(r"ghp_[A-Za-z0-9]{36}")
_GH_S = re.compile(r"ghs_[A-Za-z0-9]{36}")
_BEARER = re.compile(r"Bearer [A-Za-z0-9_\-. ]{20,}")


def run(input_data):
    delta = input_data.get("delta") or ""

    redacted = _ANTHROPIC.sub("[REDACTED-ANTHROPIC-KEY]", delta)
    redacted = _API_KEY.sub("[REDACTED-API-KEY]", redacted)
    redacted = _GH_PAT.sub("[REDACTED-GH-TOKEN]", redacted)
    redacted = _GH_S.sub("[REDACTED-GH-TOKEN]", redacted)
    redacted = _BEARER.sub("Bearer [REDACTED]", redacted)

    if redacted == delta:
        return None
    return {
        "hookSpecificOutput": {
            "hookEventName": "MessageDisplay",
            "displayContent": redacted,
        },
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
