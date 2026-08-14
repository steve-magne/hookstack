#!/usr/bin/env python3
# @hookstack notification-tts-voice
"""Reads Claude notifications out loud via system TTS (Notification)."""
import json
import re
import subprocess
import sys


def _default_exec(cmd):
    subprocess.run(
        cmd, shell=True, timeout=15, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )


def run(input_data=None, *, exec_cmd=None, platform=None):
    if exec_cmd is None:
        exec_cmd = _default_exec
    if platform is None:
        platform = sys.platform

    data = input_data or {}
    message = data.get("message") or data.get("notification") or ""
    if not message:
        return None

    text = re.sub(r"[`*_#]", "", message)[:200]
    safe = text.replace('"', '\\"')

    try:
        # macOS: say, Linux: espeak / spd-say
        if platform == "darwin":
            exec_cmd(f'say "{safe}"')
        else:
            exec_cmd(f'espeak "{safe}" 2>/dev/null || spd-say "{safe}"')
    except Exception:
        # TTS absent ou erreur — non bloquant
        pass
    return text


if __name__ == "__main__":
    data = json.load(sys.stdin)
    run(data)
