#!/usr/bin/env python3
# @hookstack pre-edit-protect-paths
"""Protects sensitive files from being written (PreToolUse Write|Edit)."""
import json
import re
import sys

PROTECTED = [
    re.compile(r"/\.env$"),
    re.compile(r"/\.env\.local$"),
    re.compile(r"/\.env\.production"),
    re.compile(r"/secrets/"),
    re.compile(r"/(id_rsa|id_ed25519|.*\.pem)$"),
]


def run(input_data):
    file_path = (input_data.get("tool_input") or {}).get("file_path") or ""
    for pattern in PROTECTED:
        if pattern.search(file_path):
            return {
                "decision": "block",
                "reason": f"Fichier protégé : {file_path}. Modifiez manuellement si intentionnel.",
            }
    return None


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
