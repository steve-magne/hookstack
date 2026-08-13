#!/usr/bin/env python3
# @hookstack post-write-ruff-format
"""Formats the Python file with ruff after write (PostToolUse Write|Edit)."""
import json
import subprocess
import sys


def _exec(cmd, timeout=15):
    return subprocess.run(
        cmd, shell=True, capture_output=True, text=True, timeout=timeout, check=True
    )


def run(input_data, exec_cmd=None):
    if exec_cmd is None:
        exec_cmd = _exec
    tool_input = input_data.get("tool_input") or {}
    file_path = tool_input.get("file_path") or tool_input.get("path") or ""
    if not file_path.endswith(".py"):
        return None

    try:
        exec_cmd(f'uv run ruff format "{file_path}"')
    except Exception:
        # uv/ruff absent — non bloquant
        pass
    return None


if __name__ == "__main__":
    data = json.load(sys.stdin)
    run(data)
