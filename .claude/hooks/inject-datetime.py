#!/usr/bin/env python3
# @hookstack user-prompt-inject-datetime
"""Injects the current date and time into every prompt (UserPromptSubmit)."""
import sys
from datetime import datetime

WEEKDAYS_FR = [
    "lundi",
    "mardi",
    "mercredi",
    "jeudi",
    "vendredi",
    "samedi",
    "dimanche",
]
MONTHS_FR = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
]
TZ_SHORT = {
    "+00:00": "UTC",
    "+01:00": "GMT+1",
    "+02:00": "GMT+2",
}


def _format_french(dt):
    weekday = WEEKDAYS_FR[dt.weekday()]
    month = MONTHS_FR[dt.month - 1]
    offset = dt.utcoffset()
    tz = TZ_SHORT.get(str(offset), "UTC") if offset else "UTC"
    return (
        f"{weekday} {dt.day} {month} {dt.year} à "
        f"{dt.hour:02d}:{dt.minute:02d} {tz}"
    )


def run(*, now=None):
    if now is None:
        now = datetime.now().astimezone()
    return f"Date et heure courantes : {_format_french(now)}\n"


if __name__ == "__main__":
    sys.stdout.write(run())
