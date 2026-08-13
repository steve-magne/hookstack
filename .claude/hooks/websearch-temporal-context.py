#!/usr/bin/env python3
# @hookstack pre-websearch-temporal-context
"""Injects the current year into temporal-ambiguous WebSearch queries (PreToolUse)."""
import json
import re
import sys
from datetime import datetime

TEMPORAL_WORDS = [
    "latest",
    "recent",
    "current",
    "new",
    "now",
    "today",
    "this year",
    "last year",
]
YEAR_PATTERN = re.compile(r"\b20\d{2}\b")


def run(input_data, *, current_year=None):
    if current_year is None:
        current_year = datetime.now().year
    query = (input_data.get("tool_input") or {}).get("query") or ""
    if not query:
        return None

    has_year = bool(YEAR_PATTERN.search(query))
    has_temporal = any(w in query.lower() for w in TEMPORAL_WORDS)
    if has_year or has_temporal:
        return None

    return {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "modifiedToolInput": {"query": f"{query} {current_year}"},
        }
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
