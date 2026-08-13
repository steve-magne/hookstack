#!/usr/bin/env python3
# @hookstack stop-pytest
"""Runs pytest at the end of a Python session (Stop)."""
import os
import re
import subprocess
import sys

PYTHON_MARKERS = ["pyproject.toml", "setup.py", "pytest.ini", "setup.cfg"]
PY = re.compile(r"\.py$")
PY_CFG = re.compile(r"(^|/)(pyproject\.toml|pytest\.ini|setup\.cfg|setup\.py)$")


def _changed_files(cwd):
    """Fichiers modifiés en attente (staged + unstaged + untracked), ou None hors git."""
    try:
        out = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True,
            text=True,
            timeout=5,
            cwd=cwd,
        ).stdout
        files = []
        for line in out.splitlines():
            p = line[3:]
            files.append(p.split(" -> ")[-1] if " -> " in p else p)
        return files
    except Exception:
        return None  # hors dépôt git → ne pas court-circuiter (comportement historique)


def _spawn(args, *, timeout=300, cwd=None):
    result = subprocess.run(
        ["uv", *args],
        capture_output=True,
        text=True,
        timeout=timeout,
        cwd=cwd,
    )
    return result


def run(*, exists=None, spawn=None, cwd=None, changed=None):
    if cwd is None:
        cwd = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    if exists is None:
        exists = lambda f: os.path.exists(os.path.join(cwd, f))
    if changed is None:
        changed = _changed_files(cwd)
    if spawn is None:
        spawn = _spawn

    is_python = any(exists(f) for f in PYTHON_MARKERS)
    if not is_python:
        return None

    # Aucun .py (ni config pytest) modifié → inutile de relancer toute la suite.
    if changed is not None and not any(PY.search(f) or PY_CFG.search(f) for f in changed):
        return None

    has_xdist = (
        spawn(
            ["run", "python", "-c", "import xdist"],
            timeout=10,
            cwd=cwd,
        ).status
        == 0
    )

    pytest_args = (
        ["run", "pytest", "-n", "auto", "--tb=short", "-q"]
        if has_xdist
        else ["run", "pytest", "--tb=short", "-q"]
    )

    result = spawn(pytest_args, timeout=300, cwd=cwd)
    out = (result.stdout or "") + (result.stderr or "")
    status = getattr(result, "status", None)
    if status is None:
        status = result.returncode if hasattr(result, "returncode") else 1
    message = (
        f"[pytest] ÉCHEC (exit {status})\n{out[-2000:]}\n"
        if status != 0
        else f"[pytest] ✓ Tests passés\n{out.splitlines()[-5:]}\n"
    )

    return {"status": status, "message": message}


if __name__ == "__main__":
    result = run()
    if result:
        sys.stderr.write(result["message"])
        if result["status"] != 0:
            sys.exit(2)
