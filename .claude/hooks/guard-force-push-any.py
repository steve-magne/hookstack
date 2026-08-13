#!/usr/bin/env python3
# @hookstack pre-bash-guard-force-push-any
"""Blocks bare git push --force / -f on any branch, recommends --force-with-lease (PreToolUse Bash)."""
import json
import re
import sys

QUOTED = re.compile(r'"(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\'')
GIT_PUSH_RE = re.compile(r"\bgit\s+push\b")
LEASE_RE = re.compile(r"--force-with-lease\b")
# --force « nu » ou un flag court combiné contenant f (ex. -fu, -f).
BARE_FORCE_RE = re.compile(r"--force\b(?!-with-lease)|(?:^|\s)-[a-eg-zA-Z]*f[a-zA-Z]*\b")


def strip_quoted_args(cmd):
    return QUOTED.sub('""', cmd)


def run(input_data):
    if input_data.get("tool_name") not in (None, "Bash"):
        return None
    command = strip_quoted_args((input_data.get("tool_input") or {}).get("command") or "")
    if not GIT_PUSH_RE.search(command):
        return None

    # --force-with-lease est le force-push SÛR : on le laisse passer.
    has_lease = bool(LEASE_RE.search(command))
    has_bare_force = bool(BARE_FORCE_RE.search(command))

    if has_bare_force and not has_lease:
        return {
            "decision": "block",
            "reason": (
                "git push --force écrase aveuglément le travail distant. "
                "Utilisez --force-with-lease : il refuse de clobberer les commits poussés par quelqu'un d'autre. "
                "Si le force-push nu est réellement voulu, lancez-le manuellement."
            ),
        }
    return None


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
