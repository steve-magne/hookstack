import importlib.util
from pathlib import Path

_HOOK = (
    Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "post-edit-visual-check.py"
)
_spec = importlib.util.spec_from_file_location("post_edit_visual_check", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _inp(file_path):
    return {"tool_input": {"file_path": file_path}}


def _ctx(file_path):
    r = hook.run(_inp(file_path))
    return r["hookSpecificOutput"]["additionalContext"] if r else None


def test_passes_through_missing_tool_input():
    assert hook.run({"tool_name": "Write"}) is None


def test_ignores_non_frontend_ts_file():
    assert hook.run(_inp("/p/src/lib/utils.ts")) is None


def test_ignores_server_mjs_file():
    assert hook.run(_inp("/p/.claude/hooks/foo.mjs")) is None


def test_ignores_extensionless_file():
    assert hook.run(_inp("/p/Makefile")) is None


def test_triggers_on_tsx_component():
    assert "component" in _ctx("/p/src/components/Card.tsx")


def test_triggers_on_jsx_component():
    assert "component" in _ctx("/p/src/components/Btn.jsx")


def test_triggers_on_css_styles():
    assert "styles" in _ctx("/p/src/app/globals.css")


def test_triggers_on_scss():
    assert "styles" in _ctx("/p/styles/main.scss")


def test_triggers_on_html():
    assert "markup" in _ctx("/p/public/index.html")


def test_triggers_on_vue_component():
    assert "markup" in _ctx("/p/src/App.vue")


def test_triggers_on_svelte():
    assert _ctx("/p/src/App.svelte") is not None


def test_mentions_filename_and_preview_invitation():
    c = _ctx("/p/src/components/Hero.tsx")
    assert "Hero.tsx" in c
    assert "preview" in c
    assert "look at it" in c


def test_targets_correct_event():
    r = hook.run(_inp("/p/x.css"))
    assert r["hookSpecificOutput"]["hookEventName"] == "PostToolUse"
