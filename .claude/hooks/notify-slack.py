#!/usr/bin/env python3
# @hookstack notification-slack
"""Sends a Slack notification when Claude wants to notify the user (Notification)."""
import json
import os
import subprocess
import sys


def _default_exec(cmd):
    subprocess.run(cmd, shell=True, capture_output=True, timeout=10)


def run(
    input_data=None,
    *,
    exec_cmd=None,
    webhook=None,
    project_dir=None,
):
    if exec_cmd is None:
        exec_cmd = _default_exec
    if webhook is None:
        webhook = os.environ.get("SLACK_WEBHOOK_URL") or ""
    if project_dir is None:
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR")

    if not webhook:
        return None

    data = input_data or {}
    message = data.get("message") or data.get("notification") or ""
    if not message:
        return None

    project = project_dir.split("/")[-1] if project_dir else "Claude"
    payload = json.dumps({"text": f"*[{project}]* {message}"})

    try:
        exec_cmd(
            f"curl -s -X POST -H 'Content-type: application/json' --data '{payload.replace(chr(39), chr(39) + chr(92) + chr(39) + chr(39))}' '{webhook}'"
        )
    except Exception:
        # Échec réseau — non bloquant
        pass
    return payload


if __name__ == "__main__":
    data = json.load(sys.stdin)
    run(data)
