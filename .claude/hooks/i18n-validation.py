#!/usr/bin/env python3
# @hookstack stop-i18n-validation
"""Validates the consistency of translation files (Stop)."""
import json
import os
import re
import sys

# Répertoires exclus du parcours : lourds et sans traduction.
# `.claude` contient les worktrees (copies complètes du repo) — principal coupable du timeout.
SKIP_DIRS = {
    "node_modules",
    ".git",
    ".claude",
    ".next",
    ".turbo",
    ".sveltekit",
    "dist",
    "build",
    ".cache",
    "coverage",
    ".worktrees",
}

# Un fichier est i18n s'il vit sous un dossier locales/messages/i18n.
I18N_PATH = re.compile(r"(?:^|[/\\])(?:locales?|messages?|i18n)[/\\]", re.IGNORECASE)


def find_i18n_json(project_dir, *, listdir=None, isdir=None, isfile=None):
    if listdir is None:
        listdir = os.listdir
    if isdir is None:
        isdir = os.path.isdir
    if isfile is None:
        isfile = os.path.isfile

    out = []

    def walk(d):
        try:
            names = listdir(d)
        except OSError:
            return
        for name in names:
            p = os.path.join(d, name)
            if isdir(p):
                if name in SKIP_DIRS:
                    continue
                walk(p)
            elif isfile(p) and name.endswith(".json"):
                rel = os.path.relpath(p, project_dir).replace(os.sep, "/")
                if I18N_PATH.search(rel):
                    out.append(f"./{rel}")

    walk(project_dir)
    return out


def _read_file(path):
    with open(path, "r", encoding="utf8") as f:
        return f.read()


def run(
    *,
    exec_cmd=None,
    read_file=None,
    project_dir=None,
    listdir=None,
    isdir=None,
    isfile=None,
):
    if read_file is None:
        read_file = _read_file
    if project_dir is None:
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()

    # `exec_cmd` n'est utilisé que par les tests (mock) ; en production, parcours natif.
    try:
        if exec_cmd:
            i18n_files = [
                f
                for f in exec_cmd('find . -name "*.json" -print').split("\n")
                if I18N_PATH.search(f) and f.endswith(".json")
            ]
        else:
            i18n_files = find_i18n_json(
                project_dir, listdir=listdir, isdir=isdir, isfile=isfile
            )
    except Exception:
        # Un Stop hook non bloquant ne doit pas crasher (ex. ETIMEDOUT) — on rend la main.
        return None

    if len(i18n_files) < 2:
        return None

    # Groupe par répertoire et vérifie la cohérence des clés
    by_dir = {}
    for f in i18n_files:
        dirname = "/".join(f.split("/")[:-1])
        by_dir.setdefault(dirname, []).append(f)

    issues = []
    for files in by_dir.values():
        if len(files) < 2:
            continue
        parsed = []
        for f in files:
            try:
                keys = set(json.loads(read_file(os.path.join(project_dir, f))).keys())
                parsed.append({"f": f, "keys": keys})
            except Exception:
                continue

        all_keys = set()
        for p in parsed:
            all_keys.update(p["keys"])
        for p in parsed:
            missing = [k for k in all_keys if k not in p["keys"]]
            if missing:
                shown = ", ".join(missing[:5])
                suffix = "…" if len(missing) > 5 else ""
                issues.append(f"{p['f']} manque {len(missing)} clé(s) : {shown}{suffix}")

    message = (
        "[i18n-validation] Incohérences détectées :\n"
        + "\n".join(f"  - {i}" for i in issues)
        + "\n"
        if issues
        else "[i18n-validation] ✓ Fichiers de traduction cohérents.\n"
    )

    return {"issues": issues, "message": message}


if __name__ == "__main__":
    result = run()
    if result:
        sys.stderr.write(result["message"])
