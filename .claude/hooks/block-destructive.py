#!/usr/bin/env python3
# @hookstack pre-bash-block-destructive
"""Blocks irreversible destructive Bash commands (PreToolUse)."""
import json
import re
import subprocess
import sys

BLOCKED = [
    (re.compile(r"rm\s+-rf?\s+/(?:\s|$)"), "rm -rf / interdit"),
    (re.compile(r"rm\s+-rf?\s+[~*]"), "rm -rf ~ / rm -rf * interdit (suppression de masse)"),
    (re.compile(r"rm\s+-rf?\s+\$HOME\b"), "rm -rf $HOME interdit"),
    (
        re.compile(r"git\s+push\s+.*--force(?:-with-lease)?\s+.*(?:main|master)"),
        "force-push sur main/master interdit",
    ),
    (re.compile(r"DROP\s+(?:TABLE|DATABASE)\s+\w+", re.I), "DROP TABLE/DATABASE interdit sans confirmation explicite"),
    (re.compile(r"TRUNCATE\s+(?:TABLE\s+)?\w+", re.I), "TRUNCATE interdit sans confirmation explicite"),
    (re.compile(r">\s*/dev/(?:sda|nvme|disk)\d*", re.I), "Écriture directe sur disque bloquée"),
    (re.compile(r"\bmkfs\b", re.I), "Formatage de système de fichiers interdit"),
    (re.compile(r"\bdd\s+if=", re.I), "Opération dd sur disque interdite"),
    (re.compile(r"chmod\s+-R\s+777\s+/", re.I), "chmod 777 récursif sur / interdit"),
]

# Retire les chaînes entre guillemets (arguments -m "...", --body "...", etc.)
# pour éviter les faux positifs sur des mentions documentaires de patterns dangereux.
QUOTED = re.compile(r'"(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\'')


def strip_quoted_args(cmd):
    return QUOTED.sub('""', cmd)


def _git_status():
    try:
        return subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True,
            text=True,
            timeout=5,
        ).stdout
    except Exception:
        return "unknown"  # hors repo / erreur git → considérer sale, donc bloquer


def run(input_data, git_status=None):
    if git_status is None:
        git_status = _git_status
    command = (input_data.get("tool_input") or {}).get("command") or ""
    stripped = strip_quoted_args(command)

    for pattern, label in BLOCKED:
        if pattern.search(stripped):
            return {"decision": "block", "reason": f"Commande destructive bloquée : {label}"}

    # git reset --hard : nuance selon la cible et l'état de l'arbre de travail.
    #   - vers une autre cible que HEAD → toujours bloqué (réécrit la branche)
    #   - vers HEAD avec arbre sale → bloqué (modifs non commitées perdues)
    #   - vers HEAD avec arbre propre → inoffensif, autorisé
    reset = re.search(r"git\s+reset\s+--hard\b\s*(\S*)", stripped)
    if reset:
        target = reset.group(1)
        if target and target != "HEAD":
            return {
                "decision": "block",
                "reason": (
                    f"git reset --hard {target} interdit — réécrit l'historique de la branche ; "
                    "faites-le manuellement si intentionnel."
                ),
            }
        if (git_status() or "").strip():
            return {
                "decision": "block",
                "reason": (
                    "git reset --hard bloqué : des modifications non commitées seraient perdues. "
                    "Commitez ou stashez-les d'abord (git stash), ou faites le reset manuellement si intentionnel."
                ),
            }
    return None


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
