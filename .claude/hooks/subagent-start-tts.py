#!/usr/bin/env python3
# @hookstack subagent-start-tts-announce
"""Announces subagent startup by TTS (SubagentStart)."""
import subprocess
import sys


def _default_exec(cmd):
    subprocess.run(
        cmd, shell=True, timeout=10, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )


def run(*, exec_cmd=None, platform=None):
    if exec_cmd is None:
        exec_cmd = _default_exec
    if platform is None:
        platform = sys.platform

    text = "Sous-agent démarré"
    try:
        if platform == "darwin":
            exec_cmd(f'say "{text}"')
        else:
            exec_cmd(f'espeak "{text}" 2>/dev/null || spd-say "{text}"')
    except Exception:
        pass
    return text


if __name__ == "__main__":
    run()
