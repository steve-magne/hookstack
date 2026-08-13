#!/usr/bin/env python3
# @hookstack block-push-closed-pr
"""Blocks pushing a branch whose PR is closed or merged (PreToolUse Bash)."""
import json
import re
import subprocess
import sys

GIT_PUSH_RE = re.compile(r"\bgit\s+push\b")


def _exec(cmd, timeout=5):
    return subprocess.run(
        cmd, shell=True, capture_output=True, text=True, timeout=timeout, check=True
    ).stdout


def run(input_data, *, exec_cmd=None):
    if exec_cmd is None:
        exec_cmd = _exec
    command = (input_data.get("tool_input") or {}).get("command") or ""
    if not GIT_PUSH_RE.search(command):
        return None

    try:
        branch = exec_cmd("git rev-parse --abbrev-ref HEAD").strip()
    except Exception:
        return None

    if not branch or branch in ("HEAD", "main", "master"):
        return None

    try:
        state = exec_cmd(
            f'gh pr view "{branch}" --json state --jq \'.state\''
        ).strip()
    except Exception:
        return None

    if state in ("CLOSED", "MERGED"):
        label = "mergée" if state == "MERGED" else "fermée"
        return {
            "decision": "block",
            "reason": (
                f"La PR de la branche '{branch}' est {label}. Créez une nouvelle branche "
                "depuis main : git checkout -b fix/... origin/main"
            ),
        }

    return None


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
