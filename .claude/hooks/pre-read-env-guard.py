#!/usr/bin/env python3
# @hookstack pre-read-env-guard
"""Blocks reading .env files — secrets must not enter the model context (PreToolUse Read)."""
import json
import os
import re
import sys

SAFE_SUFFIXES = (".example", ".sample", ".template", ".dist")
ENV_NAME_RE = re.compile(r"^\.env(\..+)?$")


def run(input_data):
    if input_data.get("tool_name") != "Read":
        return None

    file_path = (input_data.get("tool_input") or {}).get("file_path") or ""
    if not file_path:
        return None

    name = os.path.basename(file_path)
    if not ENV_NAME_RE.match(name):
        return None
    if name.endswith(SAFE_SUFFIXES):
        return None

    return {
        "decision": "block",
        "reason": (
            f"[env-guard] `{name}` likely contains secrets — they must not enter the model context "
            "(risk of leaking into logs, transcripts or generated code). Read `.env.example` for the "
            "variable names, or check a key exists without its value: `grep -c '^MY_VAR=' {name}`."
        ),
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
