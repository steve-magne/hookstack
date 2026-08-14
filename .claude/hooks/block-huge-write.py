#!/usr/bin/env python3
# @hookstack pre-edit-block-huge-write
"""Blocks writing an abnormally large file (PreToolUse Write)."""
import json
import sys

# 500 Ko : au-delà, c'est presque toujours un dump, un blob généré ou un collage accidentel.
MAX_BYTES = 500_000


def run(input_data, *, max_bytes=MAX_BYTES):
    # Seul Write fournit le contenu complet ; Edit est un patch ciblé, on l'ignore.
    if input_data.get("tool_name") not in (None, "Write"):
        return None
    content = (input_data.get("tool_input") or {}).get("content")
    if not isinstance(content, str):
        return None

    byte_len = len(content.encode("utf-8"))
    if byte_len <= max_bytes:
        return None

    file_path = (input_data.get("tool_input") or {}).get("file_path") or "le fichier"
    kb = round(byte_len / 1024)
    return {
        "decision": "block",
        "reason": (
            f"Écriture de {file_path} bloquée : {kb} Ko (> {round(max_bytes / 1024)} Ko). "
            "Un fichier de cette taille est généralement un dump ou un blob généré qui gonfle le repo "
            "et le diff. Vérifiez l'intention : générez-le à la volée, gitignorez-le, ou découpez-le."
        ),
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
