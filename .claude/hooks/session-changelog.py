#!/usr/bin/env python3
# @hookstack stop-generate-changelog
"""Appends a changelog entry from the session's git diff (Stop)."""
import os
import subprocess
import sys
from datetime import datetime, timezone


def _default_exec(cmd, cwd):
    try:
        return subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=10,
            cwd=cwd,
            check=True,
        ).stdout.strip()
    except Exception:
        return ""


def _default_append(path, content):
    with open(path, "a", encoding="utf8") as f:
        f.write(content)


def run(
    *,
    exec_cmd=None,
    append=None,
    exists=None,
    project_dir=None,
    now=None,
):
    if project_dir is None:
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    if exec_cmd is None:
        exec_cmd = lambda cmd: _default_exec(cmd, project_dir)
    if append is None:
        append = _default_append
    if exists is None:
        exists = os.path.exists
    if now is None:
        now = lambda: datetime.now(timezone.utc).isoformat()

    branch = exec_cmd("git branch --show-current")
    diff = exec_cmd("git diff --stat HEAD~1 HEAD 2>/dev/null || git diff --stat HEAD")
    commits = exec_cmd('git log -5 --pretty="- %s (%h)"')

    if not diff and not commits:
        return None

    date = now().split("T")[0]
    entry = "\n".join(
        part
        for part in [
            f"\n## {date} — Session sur `{branch or 'main'}`",
            "",
            f"### Commits\n{commits}" if commits else "",
            f"### Fichiers modifiés\n```\n{diff}\n```" if diff else "",
        ]
        if part
    )

    changelog_path = os.path.join(project_dir, "CHANGELOG.md")
    if not exists(changelog_path):
        return {
            "written": False,
            "message": "[session-changelog] CHANGELOG.md absent — entrée ignorée.\n",
        }

    append(changelog_path, f"{entry}\n")
    return {
        "written": True,
        "entry": entry,
        "message": "[session-changelog] ✓ Entrée ajoutée dans CHANGELOG.md\n",
    }


if __name__ == "__main__":
    result = run()
    if result and result.get("message"):
        sys.stderr.write(result["message"])
