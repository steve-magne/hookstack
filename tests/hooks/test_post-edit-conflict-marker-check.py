import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "post-edit-conflict-marker-check.py"
_spec = importlib.util.spec_from_file_location("post_edit_conflict_marker_check", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _edit(path):
    return {"tool_input": {"file_path": path}}


def _deps(content, exists=True):
    return {
        "read_file": lambda p, enc: content,
        "file_exists": lambda p: exists,
    }


def test_flags_conflict_markers():
    content = "line one\n<<<<<<< HEAD\nours\na\n=======\ntheirs\n>>>>>>> feature\n"
    result = hook.run(_edit("/proj/src/main.py"), **_deps(content))
    assert "conflict marker" in result["message"]


def test_ignores_file_without_both_markers():
    assert hook.run(_edit("/proj/src/main.py"), **_deps("<<<<<<< HEAD\n")) is None


def test_ignores_missing_file():
    assert hook.run(_edit("/proj/src/main.py"), **_deps("", exists=False)) is None


def test_ignores_markdown_underline():
    # Souligné markdown (lignes de ====) : pas un conflit git.
    assert hook.run(_edit("/proj/README.md"), **_deps("Heading\n=======\n")) is None
