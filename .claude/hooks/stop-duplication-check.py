#!/usr/bin/env python3
# @hookstack stop-duplication-check
"""Checks code duplication via jscpd at session stop (Stop). Non-blocking."""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib.changed_files import changed_files  # noqa: E402

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


# Sentinel : distingue « changed non fourni » (fallback git) de « changed=None
# explicite » (hors dépôt git → analyser quand même). En JS seul `undefined`
# déclenche le défaut ; en Python `None` fait les deux, d'où ce sentinel.
_UNSET = object()


def run(_input=None, *, exec_cmd=None, exists=None, changed=_UNSET):
    if exec_cmd is None:
        exec_cmd = _exec
    if exists is None:
        exists = _exists
    if changed is _UNSET:
        changed = changed_files()

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
