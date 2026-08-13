#!/usr/bin/env python3
# @hookstack session-start-stash-warning
"""Warns about stale git stashes older than 3 days (SessionStart)."""
import subprocess
import sys
import time
from datetime import datetime, timezone

DAYS = 3


def _exec(cmd):
    try:
        return subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=5, check=True
        ).stdout.strip()
    except Exception:
        return ""


def _now_ms():
    return int(time.time() * 1000)


def _parse_iso(value):
    try:
        dt = datetime.fromisoformat(value.strip())
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp() * 1000
    except Exception:
        return None


def run(*, exec_cmd=None, now=None):
    if exec_cmd is None:
        exec_cmd = _exec
    if now is None:
        now = _now_ms

    stash_list = exec_cmd('git stash list --format="%gd|%ci|%gs"')
    if not stash_list:
        return None

    current = now()
    threshold = DAYS * 24 * 60 * 60 * 1000

    stale = []
    for line in stash_list.split("\n"):
        parts = line.split("|")
        if len(parts) < 2:
            continue
        ref = parts[0]
        date = parts[1].strip()
        msg = "|".join(parts[2:]).strip()
        ts = _parse_iso(date)
        if ts is None:
            continue
        age = current - ts
        if age > threshold:
            stale.append({"ref": ref, "msg": msg, "age": age})

    if not stale:
        return None

    lines = [
        f"## ⚠️  Stashs Git oubliés ({len(stale)})",
        f"- {len(stale)} stash(s) de plus de {DAYS} jours détecté(s) :",
    ]

    for s in stale[:5]:
        days = int(s["age"] // (24 * 60 * 60 * 1000))
        lines.append(f"  - `{s['ref']}` ({days}j) — {s['msg']}")

    lines.append(
        "- Utilisez `git stash list` pour les voir, `git stash pop` ou `git stash drop` pour les gérer."
    )

    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    result = run()
    if result:
        sys.stdout.write(result)
