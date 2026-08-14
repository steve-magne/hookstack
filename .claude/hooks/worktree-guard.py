#!/usr/bin/env python3
# @hookstack pre-edit-worktree-guard
"""Blocks edits outside the current worktree (PreToolUse Write|Edit)."""
import json
import os
import subprocess
import sys

# Répertoires internes des agents — légitimes hors worktree
AGENT_DIRS = [".claude", ".codex"]


def _default_exec(cmd):
    return subprocess.run(
        cmd, shell=True, capture_output=True, text=True, timeout=5, check=True
    ).stdout.strip()


def run(input_data=None, *, exec_cmd=None, home=None):
    if exec_cmd is None:
        exec_cmd = _default_exec
    if home is None:
        home = os.path.expanduser("~")

    data = input_data or {}
    file_path = (data.get("tool_input") or {}).get("file_path") or ""
    if not file_path:
        return None

    try:
        worktree_root = exec_cmd("git rev-parse --show-toplevel")
        worktree_lines = exec_cmd("git worktree list").split("\n")
        main_root = worktree_lines[0].split()[0] if worktree_lines and worktree_lines[0] else ""

        # N'applique le garde que dans un worktree non principal
        if not main_root or worktree_root == main_root:
            return None

        abs_file = os.path.abspath(file_path)

        # Autoriser les répertoires internes des agents (plans, mémoire, config…)
        if any(abs_file.startswith(os.path.join(home, d) + os.sep) for d in AGENT_DIRS):
            return None

        if not abs_file.startswith(worktree_root + os.sep):
            return {
                "decision": "block",
                "reason": f"Écriture hors du worktree courant ({worktree_root}). Vérifiez le chemin cible.",
            }
    except Exception:
        # git absent ou pas dans un repo — laisser passer
        pass
    return None


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
