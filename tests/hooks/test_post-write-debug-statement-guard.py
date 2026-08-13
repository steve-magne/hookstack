import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "debug-statement-guard.py"
_spec = importlib.util.spec_from_file_location("debug_statement_guard", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _run(path, content, exists=True):
    return hook.run(
        {"tool_input": {"file_path": path}},
        read_file=lambda p, enc: content,
        file_exists=lambda p: exists,
    )


def test_flags_print_in_python():
    result = _run("/proj/src/main.py", "def f():\n    print('hi')\n")
    assert "print(" in result["message"]


def test_flags_console_log_in_ts():
    result = _run("/proj/src/a.ts", "console.log('x');\n")
    assert "console.log/debug" in result["message"]


def test_flags_pdb_import():
    result = _run("/proj/src/main.py", "import pdb\n")
    assert "pdb" in result["message"]


def test_ignores_clean_python():
    assert _run("/proj/src/main.py", "def f():\n    return 1\n") is None


def test_ignores_test_files():
    assert _run("/proj/tests/test_main.py", "print('ok')\n") is None


def test_ignores_unknown_extension():
    assert _run("/proj/file.md", "console.log\n") is None


def test_ignores_missing_file():
    assert _run("/proj/src/main.py", "", exists=False) is None
