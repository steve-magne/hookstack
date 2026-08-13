#!/usr/bin/env python3
# @hookstack pre-read-json-csv-compact
"""Summarizes large JSON/CSV/JSONL files before reading (PreToolUse Read)."""
import json
import os
import sys

BYTE_THRESHOLD = 50_000
CSV_PREVIEW_ROWS = 5
JSONL_PREVIEW_LINES = 3
EXTENSIONS = {"json", "csv", "jsonl", "tsv", "ndjson"}


def _read_file(path):
    with open(path, "r", encoding="utf8") as f:
        return f.read()


def _exists(path):
    return os.path.exists(path)


def _stat_size(path):
    return os.stat(path).st_size


def infer_json_schema(value, depth=0):
    if depth > 2:
        return type(value).__name__
    if value is None:
        return "null"
    if isinstance(value, list):
        inner = infer_json_schema(value[0], depth + 1) if value else "unknown"
        return f"Array<{inner}> ({len(value)} items)"
    if isinstance(value, dict):
        keys = list(value.keys())[:12]
        fields = ", ".join(f"{k}: {infer_json_schema(value[k], depth + 1)}" for k in keys)
        extra = f" … +{len(value) - 12} more" if len(value) > 12 else ""
        return f"{{ {fields}{extra} }}"
    return type(value).__name__


def summarize_json(raw, file_path):
    try:
        parsed = json.loads(raw)
    except Exception:
        return None

    lines = len(raw.split("\n"))
    bytes_n = len(raw.encode("utf-8"))
    name = os.path.basename(file_path)

    if isinstance(parsed, list):
        schema = infer_json_schema(parsed[0]) if parsed else "empty"
        return (
            f"[json-csv-compact] `{name}` — JSON array ({len(parsed)} items, "
            f"{lines} lines, {bytes_n / 1024:.1f} KB)\nItem schema: {schema}"
        )

    schema = infer_json_schema(parsed)
    return (
        f"[json-csv-compact] `{name}` — JSON object ({lines} lines, "
        f"{bytes_n / 1024:.1f} KB)\nSchema: {schema}"
    )


def summarize_csv(raw, file_path):
    lines = [l for l in raw.split("\n") if l.strip()]
    if not lines:
        return None

    name = os.path.basename(file_path)
    headers = lines[0]
    preview = lines[1 : 1 + CSV_PREVIEW_ROWS]
    total = len(lines) - 1

    cols = len(headers.split(","))
    rows = "\n".join([headers] + preview)
    return (
        f"[json-csv-compact] `{name}` — CSV ({total} rows, {cols} columns)\n"
        f"First {len(preview)} rows:\n```\n{rows}\n```"
    )


def summarize_jsonl(raw, file_path):
    lines = [l for l in raw.split("\n") if l.strip()]
    if not lines:
        return None

    name = os.path.basename(file_path)
    preview = []
    for l in lines[:JSONL_PREVIEW_LINES]:
        try:
            preview.append(infer_json_schema(json.loads(l)))
        except Exception:
            preview.append(l[:80])

    schemas = "\n".join(f"  {i}. {s}" for i, s in enumerate(preview, start=1))
    return (
        f"[json-csv-compact] `{name}` — JSONL ({len(lines)} lines)\n"
        f"First {len(preview)} line schemas:\n{schemas}"
    )


def run(input_data, *, read_file=None, exists=None, stat_size=None):
    if read_file is None:
        read_file = _read_file
    if exists is None:
        exists = _exists
    if stat_size is None:
        stat_size = _stat_size

    if input_data.get("tool_name") != "Read":
        return None

    file_path = (input_data.get("tool_input") or {}).get("file_path") or ""
    if not file_path:
        return None

    ext = os.path.splitext(file_path)[1].lower().lstrip(".")
    if ext not in EXTENSIONS:
        return None

    if not exists(file_path):
        return None

    try:
        size = stat_size(file_path)
    except Exception:
        return None
    if size < BYTE_THRESHOLD:
        return None

    try:
        raw = read_file(file_path)
    except Exception:
        return None

    if ext == "json":
        summary = summarize_json(raw, file_path)
    elif ext in ("csv", "tsv"):
        summary = summarize_csv(raw, file_path)
    else:
        summary = summarize_jsonl(raw, file_path)

    if not summary:
        return None

    return {"decision": "block", "reason": summary}


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
