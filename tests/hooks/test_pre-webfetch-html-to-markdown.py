import importlib.util
from pathlib import Path

_HOOK = (
    Path(__file__).resolve().parents[2]
    / ".claude" / "hooks" / "pre-webfetch-html-to-markdown.py"
)
_spec = importlib.util.spec_from_file_location("pre_webfetch_html_to_markdown", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)

HTML = (
    "<!DOCTYPE html><html><head><style>body{color:red}</style></head>"
    "<body><h1>Hello</h1><p>World</p><script>alert(1)</script></body></html>"
)
MARKDOWN = "# Hello\n\nWorld"


def _deps(fetch_result=HTML, convert_result=MARKDOWN, pandoc=True):
    calls = {"convert": 0}

    def fetch_url(url):
        if isinstance(fetch_result, Exception):
            raise fetch_result
        return fetch_result

    def convert_html(html):
        calls["convert"] += 1
        if isinstance(convert_result, Exception):
            raise convert_result
        return convert_result

    def has_pandoc():
        return pandoc

    return {
        "fetch_url": fetch_url,
        "convert_html": convert_html,
        "has_pandoc": has_pandoc,
        "_calls": calls,
    }


def _run_kwargs(deps):
    return {k: v for k, v in deps.items() if not k.startswith("_")}


def _input(url):
    return {"tool_name": "WebFetch", "tool_input": {"url": url}}


def test_passes_through_non_webfetch_tool():
    assert hook.run({"tool_name": "Read", "tool_input": {"url": "https://example.com"}}, **_run_kwargs(_deps())) is None


def test_passes_through_missing_url():
    assert hook.run({"tool_name": "WebFetch", "tool_input": {}}, **_run_kwargs(_deps())) is None


def test_passes_through_non_http_url():
    assert hook.run(_input("ftp://example.com"), **_run_kwargs(_deps())) is None


def test_passes_through_fetch_failure():
    deps = _deps(fetch_result=RuntimeError("network"))
    assert hook.run(_input("https://example.com"), **_run_kwargs(deps)) is None


def test_passes_through_non_html_response():
    deps = _deps(fetch_result='{"ok":true}')
    assert hook.run(_input("https://api.example.com/v1"), **_run_kwargs(deps)) is None


def test_converts_html_with_pandoc():
    result = hook.run(_input("https://docs.example.com/guide"), **_run_kwargs(_deps()))
    assert result["decision"] == "block"
    assert "docs.example.com" in result["reason"]
    assert "# Hello" in result["reason"]


def test_uses_strip_html_without_pandoc():
    deps = _deps(pandoc=False)
    result = hook.run(_input("https://example.com"), **_run_kwargs(deps))
    assert result["decision"] == "block"
    assert deps["_calls"]["convert"] == 0
    assert "Hello" in result["reason"]


def test_falls_back_to_strip_html_when_pandoc_fails():
    deps = _deps(convert_result=RuntimeError("pandoc error"))
    result = hook.run(_input("https://example.com"), **_run_kwargs(deps))
    assert result["decision"] == "block"
    assert "Hello" in result["reason"]


def test_truncates_long_content():
    deps = _deps(convert_result="a" * 40_000)
    result = hook.run(_input("https://example.com"), **_run_kwargs(deps))
    assert "truncated" in result["reason"]
    assert len(result["reason"]) < 35_000


def test_passes_through_empty_converted_result():
    deps = _deps(
        convert_result="   ",
        pandoc=False,
        fetch_result="<!DOCTYPE html><html><body></body></html>",
    )
    assert hook.run(_input("https://example.com"), **_run_kwargs(deps)) is None


def test_includes_domain_in_reason():
    result = hook.run(_input("https://nextjs.org/docs"), **_run_kwargs(_deps()))
    assert "nextjs.org" in result["reason"]
