#!/usr/bin/env python3
# @hookstack pre-webfetch-html-to-markdown
"""Converts HTML pages to Markdown before WebFetch processing (PreToolUse WebFetch)."""
import json
import re
import subprocess
import sys
from urllib.parse import urlparse

MAX_CHARS = 30_000


def _fetch_url(url):
    return subprocess.run(
        f'curl -sL --max-time 10 --user-agent "Mozilla/5.0" "$HOOK_URL"',
        shell=True,
        capture_output=True,
        text=True,
        timeout=15,
        check=True,
        env={**__import__("os").environ, "HOOK_URL": url},
    ).stdout.strip()


def _convert_html(html):
    return subprocess.run(
        "pandoc -f html -t markdown --wrap=none",
        shell=True,
        capture_output=True,
        text=True,
        timeout=10,
        check=True,
        input=html,
    ).stdout.strip()


def _has_pandoc():
    try:
        subprocess.run(
            "which pandoc", shell=True, capture_output=True, text=True, timeout=2, check=True
        )
        return True
    except Exception:
        return False


def strip_html(html):
    out = re.sub(r"<script[\s\S]*?</script>", "", html, flags=re.IGNORECASE)
    out = re.sub(r"<style[\s\S]*?</style>", "", out, flags=re.IGNORECASE)
    out = re.sub(r"<[^>]+>", " ", out)
    out = out.replace("&amp;", "&")
    out = out.replace("&lt;", "<")
    out = out.replace("&gt;", ">")
    out = out.replace("&quot;", '"')
    out = out.replace("&#39;", "'")
    out = out.replace("&nbsp;", " ")
    out = re.sub(r"[ \t]{2,}", " ", out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


def run(input_data, *, fetch_url=None, convert_html=None, has_pandoc=None):
    if fetch_url is None:
        fetch_url = _fetch_url
    if convert_html is None:
        convert_html = _convert_html
    if has_pandoc is None:
        has_pandoc = _has_pandoc

    if input_data.get("tool_name") != "WebFetch":
        return None

    url = (input_data.get("tool_input") or {}).get("url") or ""
    if not url or not re.match(r"^https?://", url, re.IGNORECASE):
        return None

    try:
        html = fetch_url(url)
    except Exception:
        return None
    if not (html or "").strip():
        return None

    # Uniquement les pages HTML — laisser passer JSON, binaires, etc.
    if not re.search(r"<html|<!doctype\s+html", html[:2000], re.IGNORECASE):
        return None

    try:
        markdown = convert_html(html) if has_pandoc() else strip_html(html)
    except Exception:
        try:
            markdown = strip_html(html)
        except Exception:
            return None

    if not (markdown or "").strip():
        return None

    content = markdown.strip()
    truncated = False
    if len(content) > MAX_CHARS:
        content = content[:MAX_CHARS]
        truncated = True

    try:
        domain = urlparse(url).hostname or url
    except Exception:
        domain = url
    suffix = f" (truncated to {MAX_CHARS} chars)" if truncated else ""

    return {
        "decision": "block",
        "reason": f"[webfetch-html-to-markdown] `{domain}` converted to Markdown{suffix}:\n\n{content}",
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
