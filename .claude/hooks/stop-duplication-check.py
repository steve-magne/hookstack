#!/usr/bin/env python3
# @hookstack stop-duplication-check
"""Checks code duplication via jscpd at session stop (Stop). Non-blocking."""
import json
import os
import re
import subprocess
import sys

MIN_TOKENS = 50  # blocs < 50 tokens ignorés (évite les faux positifs sur boilerplate)
THRESHOLD = 5  # % de duplication max avant avertissement

# Fichiers purement documentaires/binaires : pas de code à analyser.
DOC_ONLY = re.compile(
    r"\.(md|mdx|markdown|txt|rst|adoc|svg|png|jpe?g|gif|webp|ico|pdf|lock)$|(^|/)LICENSE",
    re.IGNORECASE,
)


def _exec(cmd):
    return subprocess.run(
        cmd, shell=True, capture_output=True, text=True, timeout=30, check=True
    ).stdout


def _exists(path):
    return os.path.exists(path)


def _default_changed():
    try:
        out = subprocess.run(
            "git status --porcelain",
            shell=True,
            capture_output=True,
            text=True,
            timeout=5,
            check=True,
        ).stdout
        paths = []
        for line in out.split("\n"):
            if not line:
                continue
            p = line[3:]
            paths.append(p.split(" -> ")[-1] if " -> " in p else p)
        return paths
    except Exception:
        return None  # hors dépôt git → ne pas court-circuiter


def run(_input=None, *, exec_cmd=None, exists=None, changed=None):
    if exec_cmd is None:
        exec_cmd = _exec
    if exists is None:
        exists = _exists
    if changed is None:
        changed = _default_changed()

    # Rien en attente, ou uniquement des fichiers docs/binaires → rien à dédupliquer.
    if changed is not None and (len(changed) == 0 or all(DOC_ONLY.search(f) for f in changed)):
        return None

    dirs = [d for d in ("src", "lib", "tests", "app") if exists(d)]
    if not dirs:
        return None

    bin_cmd = "node_modules/.bin/jscpd" if exists("node_modules/.bin/jscpd") else "jscpd"
    try:
        exec_cmd(f"{bin_cmd} --min-tokens {MIN_TOKENS} --threshold {THRESHOLD} --reporters console {' '.join(dirs)} 2>&1")
        return None  # exit 0 → duplication en-dessous du seuil
    except Exception as e:
        out = getattr(e, "stdout", "") or ""
        if out and re.search(r"found \d+ clone", out, re.IGNORECASE):
            return {"message": f"[duplication-check] Code duplication above {THRESHOLD}% threshold:\n{out}"}
        return None


if __name__ == "__main__":
    data = json.load(sys.stdin) if not sys.stdin.isatty() else None
    result = run(data)
    if result:
        sys.stderr.write(json.dumps(result))
