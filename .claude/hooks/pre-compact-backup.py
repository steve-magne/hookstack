#!/usr/bin/env python3
# @hookstack pre-compact-transcript-backup
"""Backs up the compaction summary to a temp file (PreCompact)."""
import json
import os
import sys
import time
from datetime import datetime, timezone


def _now():
    return datetime.now(timezone.utc).isoformat()


def _write_file(path, content):
    with open(path, "w", encoding="utf8") as f:
        f.write(content)


def _mkdir(path, *, recursive=True):
    os.makedirs(path, exist_ok=True)


def run(
    input_data,
    *,
    write_file=None,
    mkdir=None,
    backup_dir="/tmp/claude-compact-backups",
    now=None,
):
    if write_file is None:
        write_file = _write_file
    if mkdir is None:
        mkdir = _mkdir
    if now is None:
        now = _now

    summary = input_data.get("summary") or ""
    session_id = input_data.get("session_id") or f"session-{int(time.time() * 1000)}"
    if not summary:
        return None

    mkdir(backup_dir, recursive=True)
    file = os.path.join(backup_dir, f"{session_id}.json")
    payload = json.dumps(
        {"session_id": session_id, "saved_at": now(), "summary": summary},
        indent=2,
    )
    write_file(file, payload)

    return {"file": file, "message": f"[pre-compact-backup] Contexte sauvegardé → {file}\n"}


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result and result.get("message"):
        sys.stderr.write(result["message"])
