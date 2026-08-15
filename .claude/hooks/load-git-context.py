#!/usr/bin/env python3
# @hookstack session-start-load-git-context
"""Injects git context (branch, status) at session start (SessionStart)."""
import subprocess
import sys


def _exec(cmd):
    try:
        return subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=5, check=True
        ).stdout.strip()
    except Exception:
        return ""


def run(*, exec_cmd=None):
    if exec_cmd is None:
        exec_cmd = _exec
    branch = exec_cmd("git branch --show-current") or exec_cmd(
        "git rev-parse --abbrev-ref HEAD"
    )
    commit = exec_cmd('git log -1 --pretty="%h %s"')
    status = exec_cmd("git status --short")

    if not branch:
        return None

    lines = ["## Contexte Git", f"- Branche : `{branch}`"]
    if commit:
        lines.append(f"- Dernier commit : {commit}")
    if status:
        lines.append(
            "- Fichiers modifiés :\n" + "\n".join(f"  {l}" for l in status.split("\n"))
        )
    else:
        lines.append("- Répertoire de travail propre")

    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    result = run()
    if result:
        sys.stdout.write(result)
