#!/usr/bin/env python3
# @hookstack file-changed-reload-env
"""Reloads env vars from a changed file into CLAUDE_ENV_FILE (FileChanged)."""
import json
import os
import re
import sys


def _read_file(path):
    with open(path, "r", encoding="utf8") as f:
        return f.read()


def _append(path, content):
    with open(path, "a", encoding="utf8") as f:
        f.write(content)


def run(input_data, *, read_file=None, append=None, env_file=None):
    if read_file is None:
        read_file = _read_file
    if append is None:
        append = _append
    if env_file is None:
        env_file = os.environ.get("CLAUDE_ENV_FILE")

    if not env_file or input_data.get("event") == "unlink":
        return None

    try:
        content = read_file(input_data.get("file_path"))
        lines = [
            l
            for l in content.split("\n")
            if re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", l) and not l.startswith("#")
        ]
        for line in lines:
            append(env_file, f"export {line.strip()}\n")
        return {
            "count": len(lines),
            "message": f"[file-changed-reload-env] reloaded {len(lines)} vars from {input_data.get('file_path')}\n",
        }
    except Exception as e:
        return {
            "error": str(e),
            "message": f"[file-changed-reload-env] {e}\n",
        }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result and result.get("message"):
        sys.stderr.write(result["message"])
