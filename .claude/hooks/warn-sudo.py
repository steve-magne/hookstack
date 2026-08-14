#!/usr/bin/env python3
# @hookstack pre-bash-warn-sudo
"""Warns (without blocking) when a Bash command uses sudo (PreToolUse Bash)."""
import json
import re
import sys

QUOTED = re.compile(r'"(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\'')
SUDO_RE = re.compile(r"(?:^|[;&|]|&&|\|\|)\s*sudo\s+")


def strip_quoted_args(cmd):
    return QUOTED.sub('""', cmd)


def run(input_data):
    if input_data.get("tool_name") not in (None, "Bash"):
        return None
    command = strip_quoted_args((input_data.get("tool_input") or {}).get("command") or "")
    # sudo en début de commande ou après un opérateur shell (; && || |).
    if not SUDO_RE.search(command):
        return None
    return {
        "message": (
            "[warn-sudo] Cette commande utilise sudo. Une élévation de privilèges est rarement nécessaire "
            "dans une boucle de dev et peut bloquer sur une invite de mot de passe non interactive. "
            "Vérifiez si une version sans sudo (venv, --user, conteneur) suffit.\n"
        ),
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result and result.get("message"):
        sys.stderr.write(result["message"])
