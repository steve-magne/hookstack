#!/usr/bin/env python3
# @hookstack user-prompt-inject-deps-versions
"""Injects real dependency versions into every prompt (UserPromptSubmit)."""
import json
import os
import re
import sys

MAX_ENTRIES = 60  # borne le coût en tokens


def _exists(path):
    return os.path.exists(path)


def _read_file(path):
    with open(path, "r", encoding="utf8") as f:
        return f.read()


def parse_package_json(raw):
    try:
        pkg = json.loads(raw)
    except Exception:
        return []
    deps = {}
    deps.update(pkg.get("dependencies") or {})
    deps.update(pkg.get("devDependencies") or {})
    return [f"{name}@{version}" for name, version in deps.items()]


# Extraction best-effort des dépendances pyproject (PEP 621 [project] et Poetry).
def parse_pyproject(raw):
    out = []
    match = re.search(r"dependencies\s*=\s*\[([\s\S]*?)\]", raw)
    if match:
        out.extend(m.strip() for m in re.findall(r"[\"']([^\"']+)[\"']", match.group(1)))
    return out


def run(*, cwd=None, read_file=None, file_exists=None):
    if cwd is None:
        cwd = os.getcwd()
    if read_file is None:
        read_file = _read_file
    if file_exists is None:
        file_exists = _exists

    entries = []
    pkg_path = os.path.join(cwd, "package.json")
    if file_exists(pkg_path):
        try:
            entries.extend(parse_package_json(read_file(pkg_path)))
        except Exception:
            pass
    py_path = os.path.join(cwd, "pyproject.toml")
    if file_exists(py_path):
        try:
            entries.extend(parse_pyproject(read_file(py_path)))
        except Exception:
            pass

    if not entries:
        return None

    shown = entries[:MAX_ENTRIES]
    more = f" (+{len(entries) - MAX_ENTRIES} more)" if len(entries) > MAX_ENTRIES else ""
    return (
        "## Installed dependency versions\n"
        "Use these exact versions — do not assume newer/older APIs:\n"
        + "\n".join(f"- {e}" for e in shown)
        + more
        + "\n"
    )


if __name__ == "__main__":
    result = run()
    if result:
        sys.stdout.write(result)
