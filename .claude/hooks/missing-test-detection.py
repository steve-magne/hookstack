#!/usr/bin/env python3
# @hookstack stop-missing-test-detection
"""Detects modified source files without a matching test (Stop)."""
import os
import re
import subprocess
import sys

# Sources concernées (convention du projet) : src/lib|store|hooks/**/*.ts
SRC_TS = re.compile(r"(^|/)src/(lib|store|hooks)/[^/]+\.ts$")
TEST_TS = re.compile(r"\.(test|spec)\.ts$")


def _exec(cmd):
    try:
        return subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=10, check=True
        ).stdout.strip()
    except Exception:
        return ""


def _read_file(path, encoding):
    with open(path, encoding=encoding) as f:
        return f.read()


def _write_file(path, content):
    with open(path, "w", encoding="utf8") as f:
        f.write(content)


def _unlink(path):
    os.unlink(path)


def _exists(path):
    return os.path.exists(path)


def run(
    *,
    exec_cmd=None,
    exists=None,
    read_file=None,
    write_file=None,
    unlink=None,
    counter_file=None,
    disable_file=None,
    pid=None,
):
    if pid is None:
        pid = os.getppid()
    if counter_file is None:
        counter_file = f"/tmp/.claude-missing-tests-count-{pid}"
    if disable_file is None:
        disable_file = f"/tmp/.claude-missing-tests-disabled-{pid}"
    if exec_cmd is None:
        exec_cmd = _exec
    if exists is None:
        exists = _exists
    if read_file is None:
        read_file = _read_file
    if write_file is None:
        write_file = _write_file
    if unlink is None:
        unlink = _unlink

    if exists(disable_file):
        sys.stderr.write(
            f"[missing-test-detection] SUSPENDU (≥3 échecs). rm '{disable_file}' pour réactiver.\n"
        )
        return {"exitCode": 0}

    base = exec_cmd("git merge-base origin/main HEAD")
    head = exec_cmd("git rev-parse HEAD")
    raw = (
        exec_cmd(f"git diff --name-only {base} HEAD")
        if base and base != head
        else exec_cmd("git diff --name-only HEAD")
    )

    missing = []
    for f in raw.split("\n"):
        f = f.strip()
        if not f:
            continue
        if not SRC_TS.search(f):
            continue
        if TEST_TS.search(f):
            continue  # un fichier de test n'exige pas son propre test
        if not exists(f):
            continue  # fichier supprimé → pas de test requis
        name = os.path.basename(f)[:-3]  # retire le .ts
        found = exec_cmd(
            f'find src tests -name "{name}.test.ts" -o -name "{name}.spec.ts" 2>/dev/null'
        )
        if not found:
            missing.append(f)

    if not missing:
        try:
            unlink(counter_file)
        except Exception:
            pass
        sys.stderr.write(
            "[missing-test-detection] ✓ Aucun fichier source sans test détecté.\n"
        )
        return {"exitCode": 0}

    count = 0
    try:
        count = int(read_file(counter_file, "utf8").strip() or 0)
    except Exception:
        count = 0
    count += 1
    write_file(counter_file, str(count))

    msg = (
        "[FAIL] Tests manquants pour les fichiers modifiés :\n"
        + "\n".join(f"  - {f}" for f in missing)
        + "\n→ Créer les fichiers de test correspondants.\n"
    )
    if count >= 3:
        write_file(disable_file, "")
        msg += (
            f"[AUTO-DISABLE] hook suspendu après {count} échecs. rm '{disable_file}' pour réactiver.\n"
        )

    return {"exitCode": 2, "message": msg}


if __name__ == "__main__":
    result = run()
    if result.get("message"):
        sys.stderr.write(result["message"])
    sys.exit(result["exitCode"])
