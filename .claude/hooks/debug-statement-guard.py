#!/usr/bin/env python3
# @hookstack post-write-debug-statement-guard
"""Flags forgotten debug statements after a write (PostToolUse Write|Edit)."""
import json
import os
import re
import sys

# Par famille de fichiers : (motif extension, [(motif, libellé), ...]). Non bloquant.
RULES = [
    (
        re.compile(r"\.(?:[mc]?[jt]sx?)$"),
        [
            (re.compile(r"\bconsole\.(?:log|debug|trace)\s*\("), "console.log/debug"),
            (re.compile(r"\bdebugger\b\s*;?"), "debugger"),
        ],
    ),
    (
        re.compile(r"\.py$"),
        [
            (re.compile(r"^\s*print\s*\(", re.M), "print("),
            (re.compile(r"\bbreakpoint\s*\(\s*\)"), "breakpoint()"),
            (re.compile(r"\b(?:import\s+pdb|pdb\.set_trace\s*\()"), "pdb"),
        ],
    ),
    (re.compile(r"\.rs$"), [(re.compile(r"\bdbg!\s*\("), "dbg!")]),
]

TEST_FILE = re.compile(
    r"(?:\.|_|\b)(?:test|spec)\.[mc]?[jt]sx?$|(?:^|/)test_|_test\.py$"
)


def _read_file(path, encoding):
    with open(path, encoding=encoding) as f:
        return f.read()


def _file_exists(path):
    return os.path.exists(path)


def run(input_data, *, read_file=None, file_exists=None):
    if read_file is None:
        read_file = _read_file
    if file_exists is None:
        file_exists = _file_exists
    file_path = (input_data.get("tool_input") or {}).get("file_path") or ""
    if not file_path or not file_exists(file_path) or TEST_FILE.search(file_path):
        return None

    rule = next((r for r in RULES if r[0].search(file_path)), None)
    if rule is None:
        return None

    try:
        content = read_file(file_path, "utf8")
    except Exception:
        return None

    found = [label for (pat, label) in rule[1] if pat.search(content)]
    if not found:
        return None

    return {
        "message": (
            f"[debug-statement] {file_path} contient des traces de debug oubliées : "
            f"{', '.join(found)}. Retirez-les avant de commiter.\n"
        ),
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result and result.get("message"):
        sys.stderr.write(result["message"])
