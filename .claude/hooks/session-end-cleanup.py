#!/usr/bin/env python3
# @hookstack session-end-cleanup-temp
"""Cleans up Claude temp files older than 24h (SessionEnd)."""
import os
import sys
import time

MAX_AGE_SECONDS = 24 * 60 * 60
PREFIX = "claude-"


def run(
    *,
    listdir=None,
    stat=None,
    unlink=None,
    tmp="/tmp",
    max_age=MAX_AGE_SECONDS,
    now=None,
):
    if listdir is None:
        listdir = os.listdir
    if stat is None:
        stat = os.stat
    if unlink is None:
        unlink = os.unlink
    if now is None:
        now = time.time

    cleaned = 0
    try:
        for name in listdir(tmp):
            if not name.startswith(PREFIX):
                continue
            path = os.path.join(tmp, name)
            try:
                age = now() - stat(path).st_mtime
                if age > max_age:
                    unlink(path)
                    cleaned += 1
            except OSError:
                pass
    except OSError:
        pass

    if cleaned > 0:
        return {
            "cleaned": cleaned,
            "message": f"[session-end-cleanup] {cleaned} fichier(s) temporaire(s) supprimé(s).\n",
        }
    return {"cleaned": 0}


if __name__ == "__main__":
    result = run()
    if result.get("message"):
        sys.stderr.write(result["message"])
