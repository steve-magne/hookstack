#!/usr/bin/env python3
# @hookstack notification-sound
"""Plays a system sound when Claude waits for the user (Notification).
On macOS, clicking the notification brings back the right context (terminal or Claude app).
"""
import json
import os
import subprocess
import sys

# Bundle IDs des terminaux courants — clic ramène le bon contexte
TERMINAL_BUNDLE_IDS = {
    "iTerm.app": "com.googlecode.iterm2",
    "Apple_Terminal": "com.apple.Terminal",
    "WezTerm": "com.github.wez.wezterm",
    "ghostty": "com.mitchellh.ghostty",
    "vscode": "com.microsoft.VSCode",
    "cursor": "com.todesktop.230313mzl4w4u92",
}
CLAUDE_APP_BUNDLE_ID = "com.anthropic.claudefordesktop"


def resolve_activate_bundle(term_program):
    return TERMINAL_BUNDLE_IDS.get(term_program, CLAUDE_APP_BUNDLE_ID)


def _default_exec(cmd):
    subprocess.run(
        cmd, shell=True, timeout=5, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )


def _default_has_terminal_notifier():
    try:
        subprocess.run(
            "which terminal-notifier",
            shell=True,
            timeout=2,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        return True
    except Exception:
        return False


def run(
    input_data=None,
    *,
    exec_cmd=None,
    has_terminal_notifier=None,
    platform=None,
    term_program=None,
):
    if exec_cmd is None:
        exec_cmd = _default_exec
    if has_terminal_notifier is None:
        has_terminal_notifier = _default_has_terminal_notifier
    if platform is None:
        platform = sys.platform
    if term_program is None:
        term_program = os.environ.get("TERM_PROGRAM")

    try:
        if platform == "darwin":
            bundle_id = resolve_activate_bundle(term_program)

            if has_terminal_notifier():
                # Clic sur la notif → ramène automatiquement le bon contexte
                exec_cmd(
                    f'terminal-notifier -title "Claude Code" -message "Claude needs your input" '
                    f"-activate {bundle_id} -sound Glass"
                )
            else:
                # Fallback : son + notification sans action de clic (brew install terminal-notifier pour activer)
                exec_cmd("afplay /System/Library/Sounds/Glass.aiff")
                exec_cmd(
                    'osascript -e \'display notification "Claude needs your input" with title "Claude Code"\''
                )
        elif platform == "linux":
            exec_cmd(
                "paplay /usr/share/sounds/freedesktop/stereo/message.oga 2>/dev/null || "
                "aplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || true"
            )
        elif platform == "win32":
            exec_cmd('powershell -c "[console]::beep(660, 300)"')
    except Exception:
        # Son absent ou erreur — non bloquant
        pass
    return None


if __name__ == "__main__":
    data = json.load(sys.stdin)
    run(data)
