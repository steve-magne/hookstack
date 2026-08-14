#!/usr/bin/env python3
# @hookstack task-created-naming-convention
"""Enforces a ticket reference at the start of a task subject (TaskCreated)."""
import json
import re
import sys

TICKET_RE = re.compile(r"^\[[A-Z]+-\d+\]")


def run(input_data=None):
    subject = (input_data or {}).get("task_subject") or ""
    if TICKET_RE.match(subject):
        return None
    return {
        "exitCode": 2,
        "message": (
            f'Task subject must start with a ticket reference, e.g. "[PROJ-123] {subject}". '
            "Update the subject to include a valid ticket number."
        ),
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stderr.write(result["message"])
        sys.exit(result["exitCode"])
