#!/usr/bin/env python3
# @hookstack pre-write-main-guard
"""Blocks the first write on main if no worktree is active (PreToolUse Write|Edit)."""
import json
import re
import subprocess
import sys


def _exec(cmd):
    try:
        return subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=5, check=True
        ).stdout.strip()
    except Exception:
        return ""


def run(input_data, *, exec_cmd=None):
    if exec_cmd is None:
        exec_cmd = _exec

    branch = exec_cmd("git branch --show-current") or exec_cmd(
        "git rev-parse --abbrev-ref HEAD"
    )
    if not branch or not re.match(r"^(main|master)$", branch):
        return None

    worktree_list = exec_cmd("git worktree list")
    current_root = exec_cmd("git rev-parse --show-toplevel")
    lines = worktree_list.split("\n")
    main_root = lines[0].split()[0] if lines and lines[0].strip() else ""
    if main_root != current_root:
        return None

    file_path = (input_data.get("tool_input") or {}).get("file_path") or "(fichier inconnu)"

    # Autoriser les écritures vers des fichiers hors du repo principal
    if file_path != "(fichier inconnu)" and not file_path.startswith(f"{main_root}/"):
        return None

    # Autoriser les écritures dans un worktree secondaire (ex: .claude/worktrees/session-xxx/…)
    secondary_worktrees = [
        line.split()[0]
        for line in lines[1:]
        if line.strip()
    ]
    if any(file_path.startswith(f"{wt}/") for wt in secondary_worktrees):
        return None

    return {
        "decision": "block",
        "reason": (
            f"Écriture sur `{branch}` bloquée : vous êtes sur la branche principale.\n"
            f"Créez un worktree (`git worktree add ../mon-fix -b feat/mon-fix`) ou changez de branche avant de modifier `{file_path}`."
        ),
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
