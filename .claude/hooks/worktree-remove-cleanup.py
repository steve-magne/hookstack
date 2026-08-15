#!/usr/bin/env python3
# @hookstack worktree-remove-cleanup
"""Cleans up a removed worktree: docker compose down + node_modules (WorktreeRemove)."""
import json
import os
import shutil
import subprocess
import sys


def _default_exec(cmd):
    subprocess.run(cmd, shell=True, timeout=30, check=True)


def run(input_data=None, *, exec_cmd=None, exists=None, rm=None):
    if exec_cmd is None:
        exec_cmd = _default_exec
    if exists is None:
        exists = os.path.exists
    if rm is None:
        rm = lambda p, **kwargs: shutil.rmtree(p, ignore_errors=True)

    data = input_data or {}
    p = data.get("worktree_path")
    if not p:
        return None

    actions = []

    try:
        if exists(os.path.join(p, "docker-compose.yml")) or exists(
            os.path.join(p, "docker-compose.yaml")
        ):
            exec_cmd(f"docker compose -f {p}/docker-compose.yml down --remove-orphans 2>&1")
            actions.append("docker-down")
    except Exception:
        pass

    try:
        nm = os.path.join(p, "node_modules")
        if exists(nm):
            rm(nm, recursive=True, force=True)
            actions.append("rm-node-modules")
    except Exception:
        pass

    return {"actions": actions}


if __name__ == "__main__":
    data = json.load(sys.stdin)
    run(data)
