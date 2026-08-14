#!/usr/bin/env python3
# @hookstack subagent-stop-tts-summary
"""Announces subagent completion by TTS, with optional summary (SubagentStop)."""
import json
import re
import subprocess
import sys


def _default_exec(cmd):
    subprocess.run(
        cmd, shell=True, timeout=10, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )


def run(input_data=None, *, exec_cmd=None, platform=None):
    if exec_cmd is None:
        exec_cmd = _default_exec
    if platform is None:
        platform = sys.platform

    data = input_data or {}
    summary = data.get("summary") or ""
    text = (
        f"Sous-agent terminé : {re.sub(r'[`*_#]', '', summary)[:100]}"
        if summary
        else "Sous-agent terminé"
    )
    safe = text.replace('"', '\\"')

    try:
        if platform == "darwin":
            exec_cmd(f'say "{safe}"')
        else:
            exec_cmd(f'espeak "{safe}" 2>/dev/null')
    except Exception:
        pass
    return text


if __name__ == "__main__":
    try:
        data = json.load(sys.stdin)
    except Exception:
        data = {}
    run(data)
