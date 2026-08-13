#!/usr/bin/env python3
# @hookstack session-start-pull-if-main
"""Pulls the remote on main/master when behind (SessionStart)."""
import subprocess
import sys


def _exec(cmd):
    try:
        return subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=10, check=True
        ).stdout.strip()
    except Exception:
        return ""


def _pull():
    subprocess.run(
        "git pull --ff-only --quiet",
        shell=True,
        capture_output=True,
        text=True,
        timeout=30,
        check=True,
    )


def run(*, exec_cmd=None, pull=None):
    if exec_cmd is None:
        exec_cmd = _exec
    if pull is None:
        pull = _pull

    branch = exec_cmd("git branch --show-current") or exec_cmd(
        "git rev-parse --abbrev-ref HEAD"
    )
    if not branch or branch not in ("main", "master"):
        return None

    if not exec_cmd("git remote"):
        return None

    exec_cmd("git fetch --quiet 2>/dev/null")

    local_hash = exec_cmd("git rev-parse HEAD")
    remote_hash = exec_cmd("git rev-parse @{u} 2>/dev/null")
    if not remote_hash or local_hash == remote_hash:
        return None

    behind = exec_cmd("git rev-list HEAD..@{u} --count")
    ahead = exec_cmd("git rev-list @{u}..HEAD --count")
    if int(behind or 0) == 0:
        return None

    if int(ahead or 0) > 0:
        return (
            "\n".join(
                [
                    f"## ⚠️  Branche `{branch}` diverge du remote",
                    f"- {behind} commit(s) en retard, {ahead} commit(s) en avance.",
                    "- Résolvez la divergence avant de continuer (`git pull --rebase` ou merge manuel).",
                ]
            )
            + "\n"
        )

    try:
        pull()
    except Exception:
        return f"## ⚠️  `git pull` a échoué sur `{branch}` — synchronisez manuellement.\n"

    return (
        "\n".join(
            [
                "## Dépôt synchronisé",
                f"- `{behind}` commit(s) récupéré(s) depuis le remote sur `{branch}`.",
            ]
        )
        + "\n"
    )


if __name__ == "__main__":
    result = run()
    if result:
        sys.stdout.write(result)
