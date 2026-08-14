#!/usr/bin/env python3
# @hookstack pre-edit-block-generated-paths
"""Blocks writing into a generated directory (node_modules, dist, .next…) (PreToolUse Write|Edit)."""
import json
import re
import sys

# Segments de chemin qui ne contiennent que des artefacts générés : éditer ici = travail perdu.
GENERATED = re.compile(
    r"(?:^|/)(node_modules|\.next|\.nuxt|\.svelte-kit|dist|build|out|coverage|\.turbo|\.cache|__pycache__|\.venv|\.pytest_cache|\.mypy_cache)(?:/|$)"
)


def run(input_data):
    file_path = (input_data.get("tool_input") or {}).get("file_path") or ""
    if not file_path:
        return None
    hit = GENERATED.search(file_path)
    if not hit:
        return None
    return {
        "decision": "block",
        "reason": (
            f"Écriture bloquée dans un répertoire généré ('{hit.group(1)}') : {file_path}. "
            "Modifiez la source, pas l'artefact de build — il sera écrasé au prochain build. "
            "Si c'est intentionnel, faites-le manuellement."
        ),
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
