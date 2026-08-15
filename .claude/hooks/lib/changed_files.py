# @hookstack lib-changed-files
"""Shared helper for end-of-session hooks (stop-pytest, stop-quality-check,
stop-duplication-check...). Python twin of lib/changed-files.mjs.

The bug it fixes: a hook deciding to run by reading only ``git status
--porcelain`` silently disables itself once the working tree is clean again —
e.g. after a commit (or push) mid-session. Files "pending validation" also
include commits already made on the branch since the merge-base with
origin/main. This helper combines both sources (deduplicated union), like
missing-test-detection already did — and returns None outside a git repo so
hooks keep their historical behaviour (analyse anyway).
"""
import subprocess

TIMEOUT = 10


def _run(cmd, *, cwd=None):
    """Runs a git command; returns its trimmed stdout, or "" on failure (never raises)."""
    try:
        out = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=TIMEOUT,
            cwd=cwd,
            check=True,
        ).stdout
        return (out or "").strip()
    except Exception:
        return ""


def _safe(exec_cmd, cmd):
    """Tolerant run: "" if the command fails (or returns a falsy value)."""
    try:
        out = exec_cmd(cmd)
        return (out or "").strip()
    except Exception:
        return ""


def _parse_porcelain(out):
    """Parses ``git status --porcelain`` output (renames → target)."""
    paths = []
    for line in (out or "").splitlines():
        p = line[3:]
        paths.append(p.split(" -> ")[-1] if " -> " in p else p)
    return paths


def changed_files(*, exec_cmd=None, cwd=None):
    """Changed files for the session:
      1. the working tree (staged + unstaged + untracked) via porcelain
      2. commits already made on the branch since the merge-base with origin/main
         (the "clean tree but unshipped work" case that used to escape the hooks)

    Returns a deduplicated sorted list, or None outside a git repo (hooks keep
    their historical behaviour: analyse everything).
    """
    if exec_cmd is None:
        exec_cmd = lambda cmd: _run(cmd, cwd=cwd)
    try:
        porcelain = exec_cmd("git status --porcelain")
    except Exception:
        return None  # outside a git repo (or git missing) → historical behaviour
    if porcelain is None:
        return None

    paths = _parse_porcelain(porcelain)

    # Local commits already made: diff against the merge-base with origin/main.
    base = _safe(exec_cmd, "git merge-base origin/main HEAD")
    head = _safe(exec_cmd, "git rev-parse HEAD")
    if base and base != head:
        committed = _safe(exec_cmd, f"git diff --name-only {base} HEAD")
        paths += [f for f in (committed or "").splitlines() if f.strip()]

    return sorted(set(paths))
