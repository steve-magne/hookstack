#!/usr/bin/env python3
# @hookstack pre-read-block-binary
"""Blocks reading binary files Claude cannot use (PreToolUse Read)."""
import json
import os
import sys

BINARY_EXTENSIONS = {
    # Exécutables et librairies compilées
    "exe", "dll", "so", "dylib", "bin",
    # Bytecode compilé
    "pyc", "pyo", "pyd", "class", "o", "a", "lib", "obj",
    # Archives
    "zip", "tar", "gz", "bz2", "xz", "7z", "rar", "jar", "war", "ear",
    # Bases de données
    "db", "sqlite", "sqlite3",
    # Modèles ML / artefacts
    "pkl", "pickle", "pt", "pth", "h5", "pb", "onnx", "npy", "npz",
    # WebAssembly et autres
    "wasm", "node",
}


def run(input_data):
    if input_data.get("tool_name") != "Read":
        return None

    file_path = (input_data.get("tool_input") or {}).get("file_path") or ""
    if not file_path:
        return None

    ext = os.path.splitext(file_path)[1].lower().lstrip(".")
    if ext not in BINARY_EXTENSIONS:
        return None

    name = os.path.basename(file_path)
    return {
        "decision": "block",
        "reason": (
            f"[block-binary] `{name}` is a binary file (.{ext}) — Claude cannot process it "
            "meaningfully. Inspect metadata with Bash instead (e.g. `file`, `ls -lh`)."
        ),
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
