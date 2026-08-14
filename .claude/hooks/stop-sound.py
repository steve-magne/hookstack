#!/usr/bin/env python3
# @hookstack stop-sound
"""Plays a completion sound when Claude finishes a task (Stop)."""
import subprocess
import sys


def _default_exec(cmd):
    subprocess.run(
        cmd, shell=True, timeout=5, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )


def run(*, exec_cmd=None, platform=None):
    if exec_cmd is None:
        exec_cmd = _default_exec
    if platform is None:
        platform = sys.platform

    try:
        if platform == "darwin":
            exec_cmd("afplay /System/Library/Sounds/Hero.aiff")
            exec_cmd(
                'osascript -e \'display notification "Claude has finished working" with title "Claude Code"\''
            )
        elif platform == "linux":
            exec_cmd(
                "paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null || "
                "aplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || true"
            )
        elif platform == "win32":
            exec_cmd('powershell -c "[console]::beep(880, 400)"')
    except Exception:
        # Son absent ou erreur — non bloquant
        pass
    return None


if __name__ == "__main__":
    run()
