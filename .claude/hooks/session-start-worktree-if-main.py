#!/usr/bin/env python3
# @hookstack session-start-worktree-if-main
"""Creates a fresh isolated worktree when the session starts on main/master (SessionStart).
Each session gets a fresh worktree with a random suffix — never reuses an existing
worktree (a desynchronized worktree would cause conflicts). Cleanup stays manual.
"""
import os
import secrets
import subprocess
import sys
from datetime import datetime, timezone


def _default_exec(cmd):
    try:
        return subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=10, check=True
        ).stdout.strip()
    except Exception:
        return ""


def _default_add_worktree(path, branch_name):
    subprocess.run(
        f'git worktree add "{path}" -b "{branch_name}"',
        shell=True,
        timeout=15,
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def _default_random(length=6):
    return secrets.token_hex(length // 2 + 1)[:length]


def run(
    *,
    exec_cmd=None,
    add_worktree=None,
    exists=None,
    now=None,
    random=None,
):
    if exec_cmd is None:
        exec_cmd = _default_exec
    if add_worktree is None:
        add_worktree = _default_add_worktree
    if exists is None:
        exists = os.path.exists
    if now is None:
        now = lambda: datetime.now(timezone.utc)
    if random is None:
        random = _default_random

    branch = exec_cmd("git branch --show-current") or exec_cmd(
        "git rev-parse --abbrev-ref HEAD"
    )
    if not branch or branch not in ("main", "master"):
        return None

    current_root = exec_cmd("git rev-parse --show-toplevel")
    if not current_root:
        return None

    # Ne pas agir si on est déjà dans un worktree secondaire
    worktree_list = exec_cmd("git worktree list")
    lines = worktree_list.split("\n") if worktree_list else []
    main_root = lines[0].split()[0] if lines and lines[0] else ""
    if main_root != current_root:
        return None

    # Synchroniser main avec le remote avant de créer le worktree
    exec_cmd("git fetch --quiet origin main")
    exec_cmd("git merge --ff-only origin/main")

    # Nom unique par session : date + suffixe hex aléatoire
    date = now().isoformat().split("T")[0].replace("-", "")
    suffix = random(6)
    branch_name = f"claude/session-{date}-{suffix}"
    worktree_path = f"{current_root}/.claude/worktrees/session-{date}-{suffix}"

    try:
        add_worktree(worktree_path, branch_name)
    except Exception:
        return "\n".join(
            [
                "## ⚠️  Session démarrée sur `main`",
                "- Impossible de créer un worktree automatiquement.",
                "- Créez manuellement un worktree ou une branche avant de modifier des fichiers.",
            ]
        ) + "\n"

    if not exists(worktree_path):
        return None

    return "\n".join(
        [
            "## Worktree isolé créé automatiquement",
            "- Session démarrée sur `main` : un worktree unique a été créé pour cette session.",
            f"- **Chemin** : `{worktree_path}`",
            f"- **Branche** : `{branch_name}`",
            "- Travaillez dans ce worktree — évitez de modifier des fichiers dans le dépôt principal.",
        ]
    ) + "\n"


if __name__ == "__main__":
    result = run()
    if result:
        sys.stdout.write(result)
