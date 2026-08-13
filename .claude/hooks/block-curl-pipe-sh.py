#!/usr/bin/env python3
# @hookstack pre-bash-block-curl-pipe-sh
"""Blocks execution of unvetted remote scripts: curl|wget … | sh (PreToolUse Bash)."""
import json
import re
import sys

# Tuyau d'un téléchargeur vers un shell — le vecteur supply-chain n°1.
# Testés sur la commande NETTOYÉE (le contenu entre guillemets est neutralisé)
# pour éviter les faux positifs (ex. git commit -m "how to curl | sh").
PIPED = [
    # curl/wget/fetch … | (sudo) sh|bash|zsh|dash|fish
    re.compile(r"\b(?:curl|wget|fetch)\b[^|]*\|\s*(?:sudo\s+)?(?:ba|z|da|fi)?sh\b", re.I),
    # PowerShell : iwr|curl|Invoke-WebRequest … | iex|Invoke-Expression
    re.compile(r"\b(?:iwr|curl|invoke-webrequest)\b[^|]*\|\s*(?:iex|invoke-expression)\b", re.I),
]

# Substitutions exécutées par le shell même à l'intérieur de guillemets doubles
# (sh -c "$(curl …)") : testées sur la commande BRUTE.
SUBSTITUTION = [
    re.compile(r"\b(?:ba|z|da|fi)?sh\b[^\n]*<\s*\(\s*(?:curl|wget|fetch)\b", re.I),  # bash <(curl …)
    re.compile(r"\b(?:ba|z|da|fi)?sh\b[^\n]*\$\(\s*(?:curl|wget|fetch)\b", re.I),  # sh -c "$(curl …)"
]

# Retire les chaînes entre guillemets pour éviter les faux positifs.
QUOTED = re.compile(r'"(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\'')


def strip_quoted_args(cmd):
    return QUOTED.sub('""', cmd)


def run(input_data):
    if input_data.get("tool_name") not in (None, "Bash"):
        return None
    command = (input_data.get("tool_input") or {}).get("command") or ""
    stripped = strip_quoted_args(command)
    piped = any(p.search(stripped) for p in PIPED)
    substituted = any(p.search(command) for p in SUBSTITUTION)
    if not piped and not substituted:
        return None
    return {
        "decision": "block",
        "reason": (
            "Exécution d'un script distant via pipe bloquée (curl|wget … | sh). "
            "Téléchargez le script dans un fichier, inspectez-le, puis lancez-le : "
            "curl -fsSL <url> -o /tmp/install.sh && less /tmp/install.sh && sh /tmp/install.sh"
        ),
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
