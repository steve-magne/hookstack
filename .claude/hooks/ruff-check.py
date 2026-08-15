#!/usr/bin/env python3
# @hookstack post-write-ruff-check
"""Formats (silent) then lints and auto-fixes the Python file with ruff after
write (PostToolUse Write|Edit) — merge of ruff-format + ruff-check."""
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

    # Format silencieux (non bloquant), puis lint --fix (erreurs remontées).
    try:
        exec_cmd(f'uv run ruff format "{file_path}"')
    except Exception:
        pass

    try:
        exec_cmd(f'uv run ruff check --fix "{file_path}"')
    except subprocess.CalledProcessError as err:
        output = err.stdout or ""
        return {"message": f"[ruff-check] {output.strip()}\n"} if output else None
    return None


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result and result.get("message"):
        sys.stderr.write(result["message"])
