import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "stop-duplication-check.py"
_spec = importlib.util.spec_from_file_location("stop_duplication_check", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


class _Fail(Exception):
    def __init__(self, out):
        super().__init__("exit 1")
        self.stdout = out


def _no_clones(cmd, **kwargs):
    return "Analysis complete. 0 clones found."


def _with_clones(cmd, **kwargs):
    return "Found 3 clones in 4 files.\nClone at src/a.py:10-20"


def _fail_with(out):
    def exec_cmd(cmd, **kwargs):
        raise _Fail(out)

    return exec_cmd


def _deps(exec_cmd, dirs=None):
    return {
        "exec_cmd": exec_cmd,
        "exists": lambda d: d in (dirs or ["src"]),
        "changed": ["src/a.py"],
    }


def test_returns_none_without_source_dirs():
    assert hook.run(exec_cmd=lambda cmd, **kwargs: "", exists=lambda d: False) is None


def test_returns_none_when_jscpd_absent():
    def exec_cmd(cmd, **kwargs):
        raise RuntimeError("jscpd: command not found")

    assert hook.run(**_deps(exec_cmd)) is None


def test_returns_none_when_jscpd_passes():
    assert hook.run(**_deps(_no_clones)) is None
    assert hook.run(**_deps(_with_clones)) is None


def test_returns_message_when_threshold_exceeded():
    r = hook.run(**_deps(_fail_with("Found 1 clone in 2 files.")))
    assert "[duplication-check]" in r["message"]
    assert "Found 1 clone" in r["message"]


def test_returns_none_on_exit_1_without_stdout():
    assert hook.run(**_deps(_fail_with(""))) is None


def test_passes_existing_dirs_to_jscpd():
    calls = []

    def exec_cmd(cmd, **kwargs):
        calls.append(cmd)
        return "ok"

    hook.run(**{**_deps(exec_cmd, ["src", "tests"]), "changed": ["src/a.py"]})
    assert any("src tests" in c for c in calls)


def test_short_circuits_for_docs_only_changes():
    calls = []
    r = hook.run(
        exec_cmd=lambda cmd, **kwargs: calls.append(cmd) or "ok",
        exists=lambda d: d == "src",
        changed=["README.md", "CHANGELOG.md"],
    )
    assert r is None
    assert calls == []


def test_analyzes_outside_git_repo():
    calls = []

    def exec_cmd(cmd, **kwargs):
        calls.append(cmd)
        return "ok"

    hook.run(exec_cmd=exec_cmd, exists=lambda d: d == "src", changed=None)
    assert calls
