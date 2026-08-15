#!/usr/bin/env python3
# @hookstack stop-session-dedup-autodisable
"""Auto-disables Stop hooks that failed >= N times in a row (Stop).

Shared contract: a Stop hook that wants the watchdog increments
/tmp/claude-hook-counters/<slug>.counter on each failure (and removes it on
success), then checks for the absence of <slug>.disabled before running.
This hook places the .disabled marker as soon as the counter reaches MAX_FAILURES.
"""
import os
import sys

MAX_FAILURES = 3


def run(
    *,
    exists=None,
    readdir=None,
    read_file=None,
    write_file=None,
    counter_dir="/tmp/claude-hook-counters",
):
    if exists is None:
        exists = os.path.exists
    if readdir is None:
        readdir = os.listdir
    if read_file is None:
        read_file = lambda p: open(p, "r", encoding="utf8").read()
    if write_file is None:
        write_file = lambda p, content: open(p, "w", encoding="utf8").write(content)

    if not exists(counter_dir):
        return None

    try:
        counters = [f for f in readdir(counter_dir) if f.endswith(".counter")]
        disabled = []
        for f in counters:
            try:
                count = int(read_file(os.path.join(counter_dir, f)).strip()) or 0
            except Exception:
                continue
            if count < MAX_FAILURES:
                continue
            slug = f.replace(".counter", "")
            marker = os.path.join(counter_dir, f"{slug}.disabled")
            if not exists(marker):
                write_file(marker, "")
            disabled.append(slug)

        if not disabled:
            return None

        message = (
            f"[session-dedup] Hooks désactivés ({MAX_FAILURES}+ échecs) : {', '.join(disabled)}\n"
            f"[session-dedup] Supprimez {counter_dir}/<slug>.disabled (et .counter) pour réactiver.\n"
        )
        return {"disabled": disabled, "message": message}
    except Exception:
        # Erreur de lecture — ignorer silencieusement
        return None


if __name__ == "__main__":
    result = run()
    if result and result.get("message"):
        sys.stderr.write(result["message"])
