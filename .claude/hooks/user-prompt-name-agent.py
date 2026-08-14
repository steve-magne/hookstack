#!/usr/bin/env python3
# @hookstack user-prompt-llm-agent-name
"""Assigns a name to the agent for the current session (UserPromptSubmit)."""
import json
import os
import random
import sys

NAMES = [
    "Phoenix",
    "Sage",
    "Nova",
    "Echo",
    "Atlas",
    "Cipher",
    "Nexus",
    "Oracle",
    "Aurora",
    "Vortex",
]


def run(
    input_data=None,
    *,
    exists=None,
    read_file=None,
    write_file=None,
    mkdir=None,
    home=None,
    pick_name=None,
):
    if exists is None:
        exists = os.path.exists
    if read_file is None:
        read_file = lambda p: open(p, "r", encoding="utf8").read()
    if write_file is None:
        write_file = lambda p, content: open(p, "w", encoding="utf8").write(content)
    if mkdir is None:
        mkdir = os.makedirs
    if home is None:
        home = os.path.expanduser("~")
    if pick_name is None:
        pick_name = lambda: random.choice(NAMES)

    session_id = (input_data or {}).get("session_id") or "unknown"
    dir_path = os.path.join(home, ".claude", "data", "sessions")
    try:
        mkdir(dir_path, exist_ok=True)
    except Exception:
        pass

    file_path = os.path.join(dir_path, f"{session_id}.json")
    data = {"session_id": session_id}
    if exists(file_path):
        try:
            data = json.loads(read_file(file_path))
        except Exception:
            pass

    if data.get("agent_name"):
        return None

    data["agent_name"] = pick_name()
    write_file(file_path, json.dumps(data, indent=2))
    return f"Tu t'appelles **{data['agent_name']}** pour cette session.\n"


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(result)
