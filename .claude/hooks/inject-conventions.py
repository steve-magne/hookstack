#!/usr/bin/env python3
# @hookstack user-prompt-inject-conventions
"""Injects agent rules into every prompt (UserPromptSubmit)."""
import os
import sys


def _exists(path):
    return os.path.exists(path)


def _read_file(path):
    with open(path, "r", encoding="utf8") as f:
        return f.read()


def run(*, exists=None, read_file=None, project_dir=None):
    if exists is None:
        exists = _exists
    if read_file is None:
        read_file = _read_file
    if project_dir is None:
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())

    # Priorité : .claude/agent-rules.md > CONVENTIONS.md > absent (no-op)
    candidates = [
        os.path.join(project_dir, ".claude", "agent-rules.md"),
        os.path.join(project_dir, "CONVENTIONS.md"),
    ]

    target = next((c for c in candidates if exists(c)), None)
    if not target:
        return None

    content = read_file(target).strip()
    if not content:
        return None

    return f"### Conventions du projet (injectées automatiquement)\n\n{content}\n"


if __name__ == "__main__":
    result = run()
    if result:
        sys.stdout.write(result)
