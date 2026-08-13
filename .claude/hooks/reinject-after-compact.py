#!/usr/bin/env python3
# @hookstack session-start-reinject-after-compact
"""Reinjects the context saved before the last compaction (SessionStart)."""
import json
import os
import sys


def _exists(path):
    return os.path.exists(path)


def _read_file(path):
    with open(path, "r", encoding="utf8") as f:
        return f.read()


def _readdir(path):
    return os.listdir(path)


def _parse_mtime(content):
    # Extrait "saved_at" du JSON sérialisé sans le parser entièrement (robuste au reste).
    try:
        saved_at = content.split('"saved_at":"')[1].split('"')[0]
        return saved_at
    except IndexError:
        return None


def run(
    input_data,
    *,
    exists=None,
    read_file=None,
    readdir=None,
    backup_dir="/tmp/claude-compact-backups",
):
    if exists is None:
        exists = _exists
    if read_file is None:
        read_file = _read_file
    if readdir is None:
        readdir = _readdir

    session_id = input_data.get("session_id") or ""
    if not exists(backup_dir):
        return None

    # Backup de la session courante en priorité, sinon le plus récent
    backup_file = os.path.join(backup_dir, f"{session_id}.json") if session_id else None

    if not backup_file or not exists(backup_file):
        files = []
        try:
            for f in readdir(backup_dir):
                if not f.endswith(".json"):
                    continue
                saved_at = _parse_mtime(read_file(os.path.join(backup_dir, f)))
                files.append({"f": f, "saved_at": saved_at or ""})
        except OSError:
            return None
        files.sort(key=lambda x: x["saved_at"], reverse=True)
        backup_file = os.path.join(backup_dir, files[0]["f"]) if files else None

    if not backup_file or not exists(backup_file):
        return None

    try:
        data = json.loads(read_file(backup_file))
        summary = data.get("summary")
        saved_at = data.get("saved_at")
        if summary:
            return f"## Contexte de la session précédente (avant compaction du {saved_at})\n\n{summary}\n"
    except Exception:
        # Fichier corrompu — ignorer silencieusement
        pass
    return None


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(result)
