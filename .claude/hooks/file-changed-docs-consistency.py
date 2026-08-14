#!/usr/bin/env python3
# @hookstack file-changed-docs-consistency
"""Reminds to propagate README changes to sibling doc surfaces (FileChanged)."""
import json
import os
import sys


def _exists(path):
    return os.path.exists(path)


def _readdir(path):
    return os.listdir(path)


def find_sibling_readmes(*, exists=None, readdir=None, project_dir):
    if exists is None:
        exists = _exists
    if readdir is None:
        readdir = _readdir

    surfaces = []
    if exists(os.path.join(project_dir, "README.md")):
        surfaces.append("README.md")
    pkgs_dir = os.path.join(project_dir, "packages")
    if exists(pkgs_dir):
        try:
            for pkg in readdir(pkgs_dir):
                if exists(os.path.join(pkgs_dir, pkg, "README.md")):
                    surfaces.append(f"packages/{pkg}/README.md")
        except Exception:
            pass
    return surfaces


def run(input_data, *, exists=None, readdir=None, project_dir=None):
    if exists is None:
        exists = _exists
    if readdir is None:
        readdir = _readdir
    if project_dir is None:
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())

    file_path = input_data.get("file_path") or ""
    if not file_path.endswith("README.md") or input_data.get("event") == "unlink":
        return None

    changed = (
        file_path[len(project_dir) + 1 :]
        if file_path.startswith(f"{project_dir}/")
        else file_path
    )
    siblings = [
        s
        for s in find_sibling_readmes(exists=exists, readdir=readdir, project_dir=project_dir)
        if s != changed
    ]
    if not siblings:
        return None

    return {
        "hookSpecificOutput": {
            "hookEventName": "FileChanged",
            "additionalContext": (
                f"{changed} changed. These sibling docs share the same product promise and must stay consistent "
                f"(CLI examples, slugs, wording): {', '.join(siblings)}. "
                "Check whether the change needs to be mirrored there (and on the website copy if user-facing)."
            ),
        }
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
