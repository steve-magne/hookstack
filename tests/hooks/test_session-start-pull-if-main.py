import importlib.util
from pathlib import Path

_HOOK = (
    Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "session-start-pull-if-main.py"
)
_spec = importlib.util.spec_from_file_location("session_start_pull_if_main", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _exec_map(results, fallback=""):
    def exec_cmd(cmd, **kwargs):
        for key, value in results.items():
            if key in cmd:
                return value
        return fallback

    return exec_cmd


def test_returns_none_outside_main():
    assert hook.run(exec_cmd=lambda cmd, **kwargs: "feature") is None


def test_reports_divergence():
    exec_cmd = _exec_map(
        {
            "git branch --show-current": "main",
            "git remote": "origin",
            "git rev-parse HEAD": "aaa",
            "git rev-parse @{u}": "bbb",
            "git rev-list HEAD..@{u}": "2",
            "git rev-list @{u}..HEAD": "1",
        }
    )
    pulled = []
    out = hook.run(exec_cmd=exec_cmd, pull=lambda: pulled.append(True))
    assert "diverge" in out
    assert pulled == []


def test_pulls_when_purely_behind():
    exec_cmd = _exec_map(
        {
            "git branch --show-current": "main",
            "git remote": "origin",
            "git rev-parse HEAD": "aaa",
            "git rev-parse @{u}": "bbb",
            "git rev-list HEAD..@{u}": "3",
            "git rev-list @{u}..HEAD": "0",
        }
    )
    pulled = []
    out = hook.run(exec_cmd=exec_cmd, pull=lambda: pulled.append(True))
    assert pulled == [True]
    assert "synchronisé" in out


def test_returns_none_when_up_to_date():
    exec_cmd = _exec_map(
        {
            "git branch --show-current": "main",
            "git remote": "origin",
            "git rev-parse HEAD": "aaa",
            "git rev-parse @{u}": "aaa",
        }
    )
    assert hook.run(exec_cmd=exec_cmd) is None


def test_reports_pull_failure():
    exec_cmd = _exec_map(
        {
            "git branch --show-current": "main",
            "git remote": "origin",
            "git rev-parse HEAD": "aaa",
            "git rev-parse @{u}": "bbb",
            "git rev-list HEAD..@{u}": "2",
            "git rev-list @{u}..HEAD": "0",
        }
    )

    def pull_fail():
        raise RuntimeError("conflict")

    out = hook.run(exec_cmd=exec_cmd, pull=pull_fail)
    assert "a échoué" in out
