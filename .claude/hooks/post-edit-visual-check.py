#!/usr/bin/env python3
# @hookstack post-edit-visual-check
"""Reminds to verify UI rendering after editing a front-end file (PostToolUse)."""
import json
import re
import sys

# Famille de fichiers front-end → libellé du type de changement à vérifier.
FRONTEND_KINDS = [
    (re.compile(r"\.(css|scss|sass|less|styl|pcss)$", re.IGNORECASE), "styles"),
    (re.compile(r"\.(html?|svelte|vue|astro)$", re.IGNORECASE), "markup/component"),
    (re.compile(r"\.[jt]sx$", re.IGNORECASE), "component"),
]


def run(input_data):
    file_path = (input_data.get("tool_input") or {}).get("file_path") or ""
    match = next(((re_, kind) for re_, kind in FRONTEND_KINDS if re_.search(file_path)), None)
    if not match:
        return None

    _, kind = match
    name = file_path.split("/")[-1]
    return {
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": (
                f"You edited a front-end file ({name} — {kind}). "
                "Before considering this done, verify the change actually renders correctly in the browser: "
                "load it in the preview and inspect it (snapshot/screenshot, check the console for errors, "
                "and test the affected interaction/responsive state). "
                "Do not assume the UI looks right from the diff alone — look at it."
            ),
        }
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
