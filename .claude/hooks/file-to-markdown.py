#!/usr/bin/env python3
# @hookstack pre-read-file-to-markdown
"""Converts PDF/DOCX/PPTX and other binaries to Markdown before reading (PreToolUse Read)."""
import json
import os
import subprocess
import sys

MAX_CHARS = 50_000

SUPPORTED = {
    "pdf",
    "docx",
    "pptx",
    "odt",
    "rtf",
    "doc",
    "ppt",
    "xlsx",
    "epub",
    "html",
    "htm",
}


def _exec(cmd):
    return subprocess.run(
        cmd, shell=True, capture_output=True, text=True, timeout=30, check=True
    ).stdout.strip()


def _exists(path):
    return os.path.exists(path)


def _has_binary(name, exec_cmd):
    try:
        exec_cmd(f"which {name}")
        return True
    except Exception:
        return False


def run(input_data, *, exec_cmd=None, exists=None):
    if exec_cmd is None:
        exec_cmd = _exec
    if exists is None:
        exists = _exists

    if input_data.get("tool_name") != "Read":
        return None

    file_path = (input_data.get("tool_input") or {}).get("file_path") or ""
    if not file_path:
        return None

    ext = os.path.splitext(file_path)[1].lower().lstrip(".")
    if ext not in SUPPORTED:
        return None

    if not exists(file_path):
        return None

    has_pdftotext = ext == "pdf" and _has_binary("pdftotext", exec_cmd)
    has_pandoc = _has_binary("pandoc", exec_cmd)

    if not has_pdftotext and not has_pandoc:
        return None

    try:
        if ext == "pdf" and has_pdftotext:
            markdown = exec_cmd(f'pdftotext "{file_path}" -')
        elif has_pandoc:
            markdown = exec_cmd(f'pandoc --to markdown --wrap=none "{file_path}"')
        else:
            return None
    except Exception:
        return None

    if not (markdown or "").strip():
        return None

    content = markdown.strip()
    truncated = False
    if len(content) > MAX_CHARS:
        content = content[:MAX_CHARS]
        truncated = True

    name = os.path.basename(file_path)
    suffix = f" (truncated to {MAX_CHARS} chars)" if truncated else ""
    header = f"[file-to-markdown] `{name}` converted to Markdown{suffix}:\n\n"

    return {"decision": "block", "reason": header + content}


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
