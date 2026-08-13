#!/usr/bin/env python3
# @hookstack session-start-github-context
"""Injects GitHub state (open PRs, branch checks) at session start (SessionStart)."""
import json
import subprocess
import sys


def _exec(cmd):
    try:
        return subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=10, check=True
        ).stdout.strip()
    except Exception:
        return ""


def run(_input=None, *, exec_cmd=None):
    if exec_cmd is None:
        exec_cmd = _exec

    # Silencieux si gh absent, non authentifié ou dépôt sans remote GitHub
    prs = exec_cmd("gh pr list --state open --limit 5")
    checks = exec_cmd("gh pr checks 2>/dev/null")

    if not prs and not checks:
        return None

    lines = ["## GitHub Context"]
    if prs:
        lines.append("### Open PRs")
        lines.append("```")
        lines.append(prs)
        lines.append("```")
    if checks:
        lines.append("### Checks on current branch PR")
        lines.append("```")
        lines.append(checks)
        lines.append("```")

    return {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": "\n".join(lines),
        }
    }


if __name__ == "__main__":
    data = json.load(sys.stdin) if not sys.stdin.isatty() else None
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
