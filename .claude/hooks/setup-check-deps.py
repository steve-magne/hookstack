#!/usr/bin/env python3
# @hookstack setup-check-install-deps
"""Checks that project dependencies are up to date at session start (SessionStart)."""
import os
import sys

SPECS = [
    ("pnpm-lock.yaml", "node_modules", "pnpm install"),
    ("package-lock.json", "node_modules", "npm ci"),
    ("yarn.lock", "node_modules", "yarn install --frozen-lockfile"),
    # Projet uv : le lockfile uv.lock est la référence (requirements.txt n'est pas un lockfile).
    ("uv.lock", ".venv", "uv sync"),
]


def run(*, exists=None, stat=None, project_dir=None):
    if project_dir is None:
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    if exists is None:
        exists = lambda f: os.path.exists(os.path.join(project_dir, f))
    if stat is None:
        stat = os.stat

    warnings = []
    for lockfile, modules_dir, install_cmd in SPECS:
        lock = os.path.join(project_dir, lockfile)
        mods = os.path.join(project_dir, modules_dir)
        if not exists(lock):
            continue
        if not exists(mods):
            warnings.append(
                f"[setup-check-deps] ⚠ {modules_dir} absent — lancez : {install_cmd}\n"
            )
            continue
        if stat(lock).st_mtime > stat(mods).st_mtime:
            warnings.append(
                f"[setup-check-deps] ⚠ {lockfile} plus récent que {modules_dir} — lancez : {install_cmd}\n"
            )

    return {"warnings": warnings, "message": "".join(warnings)}


if __name__ == "__main__":
    result = run()
    if result["message"]:
        sys.stderr.write(result["message"])
