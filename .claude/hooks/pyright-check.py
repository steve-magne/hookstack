#!/usr/bin/env python3
# @hookstack post-edit-pyright
"""Type-checks the Python file with pyright after edit (PostToolUse Write|Edit)."""
import json
import subprocess
import sys


def _exec(cmd, timeout=30):
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
        exec_cmd(f'uv run pyright "{file_path}"')
    except subprocess.CalledProcessError as err:
        output = err.stdout or ""
        return {"message": f"[pyright] {output.strip()}\n"} if output else None
    return None


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result and result.get("message"):
        sys.stderr.write(result["message"])
