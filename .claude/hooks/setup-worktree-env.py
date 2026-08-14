#!/usr/bin/env python3
# @hookstack worktree-create-setup-env
"""SessionStart: if the session starts in a worktree, copies local env/secret files
from the main repo. Two passes:
  1. Static list of known root files (multi-ecosystem)
  2. Recursive scan (find, depth 4) to cover monorepos (apps/web/.env…)
"""
import os
import shutil
import subprocess
import sys


def _default_exec(cmd):
    try:
        return subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=10, check=True
        ).stdout.strip()
    except Exception:
        return ""


# Fichiers racine copiés explicitement si présents.
# Couvre Node/Bun, Vite, Next.js, CRA, Python dotenv, Ruby on Rails, direnv, Docker Compose.
ROOT_FILES = [
    # Dotenv standard — tous frameworks JS/TS/Python
    ".env",
    ".env.local",
    ".env.development",
    ".env.development.local",
    ".env.test",
    ".env.test.local",
    ".env.staging",
    ".env.staging.local",
    ".env.production",
    ".env.production.local",
    ".env.override",  # convention docker-compose
    # direnv
    ".envrc",
    # Ruby on Rails master key
    "config/master.key",
]

# Répertoires exclus du scan récursif monorepo.
SKIP_DIRS = [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "out",
    "coverage",
    ".turbo",
    ".cache",
    "__pycache__",
    "target",
    ".venv",
    "venv",
]


def _default_scan_env_files(dir_path):
    excludes = " ".join(f'-not -path "*/{d}/*"' for d in SKIP_DIRS)
    cmd = (
        f'find "{dir_path}" -mindepth 2 -maxdepth 4 -type f \\( -name ".env" -o '
        f'-name ".env.*" -o -name ".envrc" \\) {excludes} 2>/dev/null'
    )
    try:
        out = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=10, check=True
        ).stdout.strip()
        if not out:
            return []
        return [abs_path[len(dir_path) + 1 :] for abs_path in out.split("\n")]
    except Exception:
        return []


def run(
    *,
    exec_cmd=None,
    exists=None,
    copy=None,
    mkdir=None,
    scan_env_files=None,
):
    if exec_cmd is None:
        exec_cmd = _default_exec
    if exists is None:
        exists = os.path.exists
    if copy is None:
        copy = shutil.copyfile
    if mkdir is None:
        mkdir = os.makedirs
    if scan_env_files is None:
        scan_env_files = _default_scan_env_files

    worktree_list = exec_cmd("git worktree list")
    lines = worktree_list.split("\n") if worktree_list else []
    main_dir = lines[0].split()[0] if lines and lines[0] else ""
    worktree_dir = exec_cmd("git rev-parse --show-toplevel")

    if not main_dir or not worktree_dir or main_dir == worktree_dir:
        return

    # Fusion liste statique + résultats du scan monorepo (déduplication)
    candidates = list(ROOT_FILES)
    for rel in scan_env_files(main_dir):
        if rel not in candidates:
            candidates.append(rel)

    for rel in candidates:
        src = os.path.join(main_dir, rel)
        dst = os.path.join(worktree_dir, rel)
        if exists(src) and not exists(dst):
            dst_dir = os.path.dirname(dst)
            if not exists(dst_dir):
                mkdir(dst_dir, exist_ok=True)
            copy(src, dst)
            sys.stderr.write(f"Copié : {rel} → {worktree_dir}\n")


if __name__ == "__main__":
    # SessionStart : stdout vide = aucun contexte ajouté.
    run()
