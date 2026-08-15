#!/usr/bin/env python3
# @hookstack user-prompt-inject-datetime
"""Injects the current date and time into every prompt (UserPromptSubmit)."""
import sys
from datetime import datetime, timedelta


def _format_neutral(dt):
    """Format ISO-like sans locale codée en dur — déterministe pour les tests."""
    offset = dt.utcoffset() or timedelta(0)
    total_min = int(offset.total_seconds() // 60)
    sign = "+" if total_min >= 0 else "-"
    tz = f"UTC{sign}{abs(total_min) // 60:02d}:{abs(total_min) % 60:02d}"
    return f"{dt:%Y-%m-%d %H:%M} ({tz})"


def run(*, now=None):
    if now is None:
        now = datetime.now().astimezone()
    return f"Date et heure courantes : {_format_neutral(now)}\n"


if __name__ == "__main__":
    sys.stdout.write(run())
