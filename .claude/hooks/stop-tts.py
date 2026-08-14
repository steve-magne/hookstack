#!/usr/bin/env python3
# @hookstack stop-tts-completion
"""Announces the end of the Claude session by TTS (Stop)."""
import os
import subprocess
import sys


def _default_exec(cmd):
    subprocess.run(
        cmd, shell=True, timeout=10, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )


def run(*, exec_cmd=None, platform=None, project_dir=None):
    if exec_cmd is None:
        exec_cmd = _default_exec
    if platform is None:
        platform = sys.platform
    if project_dir is None:
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR")

    project = project_dir.split("/")[-1] if project_dir else "Claude"
    text = f"Tâche terminée sur {project}"

    try:
        if platform == "darwin":
            exec_cmd(f'say "{text}"')
        else:
            exec_cmd(f'espeak "{text}" 2>/dev/null || spd-say "{text}"')
    except Exception:
        # TTS absent — non bloquant
        pass
    return text


if __name__ == "__main__":
    run()
