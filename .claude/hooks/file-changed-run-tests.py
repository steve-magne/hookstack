#!/usr/bin/env python3
# @hookstack file-changed-run-tests
"""Re-runs the affected tests when a source file changes (FileChanged)."""
import json
import os
import subprocess
import sys


def _exec(cmd):
    env = dict(os.environ)
    env["CI"] = "true"
    return subprocess.run(
        cmd, shell=True, capture_output=True, text=True, timeout=90, check=True, env=env
    ).stdout


def _exists(path):
    return os.path.exists(path)


def run(input_data, *, exec_cmd=None, exists=None, project_dir=None):
    if exec_cmd is None:
        exec_cmd = _exec
    if exists is None:
        exists = _exists
    if project_dir is None:
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())

    if input_data.get("event") == "unlink":
        return None

    file_path = input_data.get("file_path") or ""

    # Projet Python : pytest via uv (préféré) ou python3 en repli.
    has_pyproject = exists(os.path.join(project_dir, "pyproject.toml"))
    if has_pyproject:
        cmd = "uv run pytest -q 2>&1"
    else:
        cmd = "python3 -m pytest -q 2>&1"

    try:
        out = exec_cmd(cmd)
        return {
            "hookSpecificOutput": {
                "hookEventName": "FileChanged",
                "additionalContext": f"Tests passed after {file_path} changed.\n{out[-500:]}",
            }
        }
    except Exception as e:
        out = (getattr(e, "stdout", None) or getattr(e, "stderr", None) or str(e))[:1000]
        return {
            "hookSpecificOutput": {
                "hookEventName": "FileChanged",
                "additionalContext": f"Tests FAILED after {file_path} changed:\n{out}",
            }
        }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
