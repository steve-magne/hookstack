#!/usr/bin/env python3
# @hookstack stop-quality-check
"""Quality gate at the end of a Python session: ruff lint + pyright types (Stop).

Python-only variant: installed on Python projects, where the .mjs variant (tsc +
biome) would be useless. Tests are left to the stop-pytest hook to avoid running
the suite twice.
"""
import os
import re
import subprocess
import sys

PY = re.compile(r"\.py$")
PY_CFG = re.compile(
    r"(^|/)(pyproject\.toml|setup\.py|setup\.cfg|pytest\.ini|ruff\.toml|\.ruff\.toml|pyrightconfig\.json)$"
)


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


def _exec(cmd, timeout=60):
    return subprocess.run(
        cmd, shell=True, capture_output=True, text=True, timeout=timeout, check=True
    )


def run(*, exec_cmd=None, exists=None, project_dir=None, changed=None):
    if project_dir is None:
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    if exists is None:
        exists = lambda f: os.path.exists(os.path.join(project_dir, f))
    if changed is None:
        changed = _changed_files(project_dir)
    if exec_cmd is None:
        exec_cmd = _exec

    # Aucun .py (ni config python) modifié → checks inutiles.
    if changed is not None and not any(
        PY.search(f) or PY_CFG.search(f) for f in changed
    ):
        return {"checks": 0, "failed": 0, "message": ""}

    # Gate Python : projets pyproject (ère uv). Les repos legacy setup.py-only
    # n'ont pas de gate standardisé — les hooks par-fichier ruff/pyright couvrent.
    if not exists("pyproject.toml"):
        return {"checks": 0, "failed": 0, "message": ""}

    messages = []
    checks = []

    def run_check(label, cmd):
        try:
            exec_cmd(cmd)
            messages.append(f"[quality-check] ✓ {label}\n")
            return True
        except subprocess.CalledProcessError as err:
            out = (err.stdout or "").strip()
            messages.append(
                f"[quality-check] ✗ {label}\n{out[-500:]}\n" if out else f"[quality-check] ✗ {label}\n"
            )
            return False

    touched_py = [f for f in (changed or []) if PY.search(f)]
    if touched_py:
        files = " ".join(f'"{f}"' for f in touched_py)
        checks.append(("Ruff", f"uv run ruff check {files}"))
        checks.append(("Pyright", f"uv run pyright {files}"))
    else:
        # Hors git ou changement de config seul → repo entier.
        checks.append(("Ruff", "uv run ruff check ."))
        checks.append(("Pyright", "uv run pyright"))

    results = [run_check(label, cmd) for label, cmd in checks]
    failed = len([r for r in results if not r])

    if failed > 0:
        messages.append(f"[quality-check] {failed}/{len(checks)} vérification(s) échouée(s).\n")
    elif checks:
        messages.append("[quality-check] ✓ Tous les contrôles qualité passent.\n")

    return {"checks": len(checks), "failed": failed, "message": "".join(messages)}


if __name__ == "__main__":
    result = run()
    sys.stderr.write(result["message"])
    if result["failed"] > 0:
        sys.exit(2)
