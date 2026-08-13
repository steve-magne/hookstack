#!/usr/bin/env python3
# @hookstack stop-dead-link-checker
"""Checks broken relative links across all Markdown files in the repo (Stop)."""
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
# Capture [text](href) — exclut les images ![alt](src) incluses dans la même syntaxe
LINK_RE = re.compile(r"(?<!!)\[([^\]]*)\]\(([^)]+)\)")


def _read_file(path):
    with open(path, "r", encoding="utf8") as f:
        return f.read()


def _exists(path):
    return os.path.exists(path)


def _readdir(path):
    with os.scandir(path) as it:
        return list(it)


def is_relative(href):
    return not href.startswith("http") and not href.startswith("#") and not href.startswith("mailto:")


def strip_anchor(href):
    return href.split("#")[0].strip()


# Ignore les liens d'exemple à l'intérieur des blocs de code (```...```)
def strip_fences(text):
    in_fence = False
    lines = []
    for line in text.split("\n"):
        if re.match(r"^(```|~~~)", line.strip()):
            in_fence = not in_fence
            continue
        if not in_fence:
            lines.append(line)
    return "\n".join(lines)


# Liens commençant par "/" : convention OKF v0.1, relatifs à la racine du bundle okf/
def resolve_abs(file, target, project_dir):
    if target.startswith("/"):
        return os.path.join(project_dir, "okf", target[1:])
    return os.path.normpath(os.path.join(os.path.dirname(file), target))


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

        for m in LINK_RE.finditer(strip_fences(content)):
            href = m.group(2)
            if not is_relative(href):
                continue
            target = strip_anchor(href)
            if not target:
                continue  # lien ancre pure (#section)
            abs_path = resolve_abs(file, target, project_dir)
            if not exists(abs_path):
                broken.append(f"{file.replace(project_dir + '/', '')}  →  {href}")

    if not broken:
        return None

    return {
        "message": (
            f"[dead-link-checker] {len(broken)} broken relative link(s) across docs:\n"
            + "\n".join(f"  - {b}" for b in broken)
            + "\n"
        )
    }


if __name__ == "__main__":
    data = json.load(sys.stdin) if not sys.stdin.isatty() else None
    result = run(data)
    if result:
        sys.stderr.write(json.dumps(result))
