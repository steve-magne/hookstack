#!/usr/bin/env python3
# @hookstack cwd-changed-reload-direnv
"""Reloads direnv when the working directory changes (CwdChanged)."""
import json
import os
import subprocess
import sys


def _default_exec(cmd, cwd):
    subprocess.run(cmd, shell=True, cwd=cwd, timeout=5, check=True)


def run(input_data=None, *, exec_cmd=None, exists=None):
    if exec_cmd is None:
        exec_cmd = _default_exec
    if exists is None:
        exists = os.path.exists

    data = input_data or {}
    new_cwd = data.get("cwd") or data.get("new_cwd") or os.getcwd()
    envrc = os.path.join(new_cwd, ".envrc")
    if not exists(envrc):
        return None

    try:
        exec_cmd("direnv allow .", new_cwd)
        return {"message": f"[reload-direnv] direnv rechargé dans {new_cwd}\n"}
    except Exception:
        # direnv absent — non bloquant
        return None


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result and result.get("message"):
        sys.stderr.write(result["message"])
