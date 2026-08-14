#!/usr/bin/env python3
# @hookstack stop-dead-image-checker
"""Checks broken relative images across all Markdown files in the repo (Stop)."""
import json
import os
import re
import sys

SKIP_DIRS = {
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "out",
    ".claude",
}
# Capture ![alt](src) — uniquement les images (le ! est obligatoire)
IMAGE_RE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")


def _read_file(path):
    with open(path, "r", encoding="utf8") as f:
        return f.read()


def _exists(path):
    return os.path.exists(path)


def _readdir(path):
    with os.scandir(path) as it:
        return list(it)


def strip_code(content):
    # Supprime les blocs de code clôturés (``` ou ~~~) — multiline
    content = re.sub(r"^```[\s\S]*?^```\s*$", "", content, flags=re.M)
    content = re.sub(r"^~~~[\s\S]*?^~~~\s*$", "", content, flags=re.M)
    # Supprime les spans de code inline
    content = re.sub(r"`[^`\n]+`", "``", content)
    return content


def is_external(src):
    return src.startswith("http") or src.startswith("data:") or src.startswith("//")


def walk_md(directory, *, readdir, exists):
    if not exists(directory):
        return []
    results = []
    try:
        entries = readdir(directory)
    except Exception:
        return results
    for entry in entries:
        if entry.name in SKIP_DIRS:
            continue
        full = os.path.join(directory, entry.name)
        if entry.is_dir():
            results.extend(walk_md(full, readdir=readdir, exists=exists))
        elif re.search(r"\.mdx?$", entry.name):
            results.append(full)
    return results


def run(_input=None, *, project_dir=None, read_file=None, exists=None, readdir=None):
    if read_file is None:
        read_file = _read_file
    if exists is None:
        exists = _exists
    if readdir is None:
        readdir = _readdir
    if project_dir is None:
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())

    md_files = walk_md(project_dir, readdir=readdir, exists=exists)
    if not md_files:
        return None

    broken = []
    for file in md_files:
        try:
            content = read_file(file)
        except Exception:
            continue

        for m in IMAGE_RE.finditer(strip_code(content)):
            src = m.group(2)
            if is_external(src):
                continue

            if src.startswith("/"):
                # Chemin absolu → résolu depuis public/ (convention Next.js et sites statiques)
                # (concaténation type path.join Node : un composant absolu ne réinitialise pas)
                abs_path = os.path.normpath(project_dir + os.sep + "public" + src)
            else:
                abs_path = os.path.normpath(os.path.join(os.path.dirname(file), src))

            if not exists(abs_path):
                broken.append(f"{file.replace(project_dir + '/', '')}  →  {src}")

    if not broken:
        return None

    return {
        "message": (
            f"[dead-image-checker] {len(broken)} broken image reference(s) across docs:\n"
            + "\n".join(f"  - {b}" for b in broken)
            + "\n"
        )
    }


if __name__ == "__main__":
    data = json.load(sys.stdin) if not sys.stdin.isatty() else None
    result = run(data)
    if result:
        sys.stderr.write(json.dumps(result))
