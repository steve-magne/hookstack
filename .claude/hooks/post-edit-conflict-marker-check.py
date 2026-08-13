#!/usr/bin/env python3
# @hookstack post-edit-conflict-marker-check
"""Flags forgotten git conflict markers after a write (PostToolUse Write|Edit)."""
import json
import os
import re
import sys

OPEN_MARKER = re.compile(r"^<{7} ", re.M)
CLOSE_MARKER = re.compile(r"^>{7} ", re.M)


def _read_file(path, encoding):
    with open(path, encoding=encoding) as f:
        return f.read()


def _file_exists(path):
    return os.path.exists(path)


def run(input_data, *, read_file=None, file_exists=None):
    if read_file is None:
        read_file = _read_file
    if file_exists is None:
        file_exists = _file_exists
    file_path = (input_data.get("tool_input") or {}).get("file_path") or ""
    if not file_path or not file_exists(file_path):
        return None

    try:
        content = read_file(file_path, "utf8")
    except Exception:
        return None

    # Les deux bornes sont requises : évite les faux positifs (ex. soulignés markdown).
    if not OPEN_MARKER.search(content) or not CLOSE_MARKER.search(content):
        return None

    return {
        "message": (
            f"[conflict-marker] {file_path} contains git conflict markers (<<<<<<< / >>>>>>>). "
            "Resolve the conflict and remove the markers before moving on.\n"
        ),
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result and result.get("message"):
        sys.stderr.write(result["message"])
