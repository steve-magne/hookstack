#!/usr/bin/env python3
# @hookstack pre-write-env-gitignore-guard
"""Warns if a created .env file is not covered by .gitignore (PreToolUse Write|Edit)."""
import json
import os
import re
import sys

# .env, .env.local, .env.production… mais PAS les modèles partagés (.env.example/.sample/.template).
ENV_FILE = re.compile(r"^\.env(?:\.[A-Za-z0-9_-]+)?$")
TEMPLATE = re.compile(r"\.(?:example|sample|template|dist)$", re.I)

# Une ligne de .gitignore qui couvre les fichiers .env.
COVERS_ENV = re.compile(r"^\s*\.env(?:\*|\.\*)?\s*$|^\s*\*\.env\s*$", re.M)


def _read_file(path, encoding):
    with open(path, encoding=encoding) as f:
        return f.read()


def _file_exists(path):
    return os.path.exists(path)


def _find_gitignore(dir_path, file_exists, depth=0):
    if depth > 6 or not dir_path:
        return None
    candidate = os.path.join(dir_path, ".gitignore")
    if file_exists(candidate):
        return candidate
    parent = os.path.dirname(dir_path)
    return None if parent == dir_path else _find_gitignore(parent, file_exists, depth + 1)


def run(input_data, *, read_file=None, file_exists=None):
    if read_file is None:
        read_file = _read_file
    if file_exists is None:
        file_exists = _file_exists
    file_path = (input_data.get("tool_input") or {}).get("file_path") or ""
    base = os.path.basename(file_path)
    if not ENV_FILE.match(base) or TEMPLATE.search(base):
        return None

    gitignore = _find_gitignore(os.path.dirname(file_path), file_exists)
    covered = False
    if gitignore:
        try:
            covered = bool(COVERS_ENV.search(read_file(gitignore, "utf8")))
        except Exception:
            covered = False
    if covered:
        return None

    return {
        "message": (
            f"[env-gitignore] {base} n'est pas couvert par .gitignore — un secret pourrait être "
            "commité. Ajoutez une ligne `.env*` à votre .gitignore avant d'y mettre des valeurs.\n"
        ),
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result and result.get("message"):
        sys.stderr.write(result["message"])
