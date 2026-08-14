import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "missing-test-detection.py"
_spec = importlib.util.spec_from_file_location("missing_test_detection", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _make(exec_map=None, files=None, disable=False):
    exec_map = exec_map or {}
    state = {"count": 0, "unlinked": [], "written": {}}

    def exec_cmd(cmd, **kwargs):
        for prefix, value in exec_map.items():
            if cmd.startswith(prefix):
                return value
        return ""

    return {
        "exec_cmd": exec_cmd,
        "exists": lambda p: disable if p.endswith("disabled") else (p in (files or set())),
        "read_file": lambda p, enc: state["written"].get(p, "0"),
        "write_file": lambda p, c: state["written"].update({p: c}),
        "unlink": lambda p: state["unlinked"].append(p),
        "counter_file": "/tmp/counter",
        "disable_file": "/tmp/disabled",
        "state": state,
    }


def test_ok_when_no_missing_tests():
    m = _make(exec_map={"git diff --name-only": "src/lib/foo.ts\n"})
    result = hook.run(**{k: v for k, v in m.items() if k != "state"})
    assert result["exitCode"] == 0
    assert m["state"]["unlinked"] == ["/tmp/counter"]


def test_flags_missing_test_and_increments():
    m = _make(
        exec_map={
            "git merge-base": "base-sha",
            "git rev-parse": "head-sha",
            "git diff --name-only base-sha HEAD": "src/lib/foo.ts\n",
            "find src tests": "",
        },
        files={"src/lib/foo.ts"},
    )
    result = hook.run(**{k: v for k, v in m.items() if k != "state"})
    assert result["exitCode"] == 2
    assert "src/lib/foo.ts" in result["message"]
    assert m["state"]["written"]["/tmp/counter"] == "1"


def test_ignores_test_files_and_covered_files():
    m = _make(
        exec_map={
            "git diff --name-only": "src/lib/foo.test.ts\nsrc/lib/bar.ts\n",
            "find src tests": "src/lib/bar.test.ts\n",
        },
        files={"src/lib/bar.ts"},
    )
    result = hook.run(**{k: v for k, v in m.items() if k != "state"})
    assert result["exitCode"] == 0


def test_ignores_deleted_files():
    m = _make(
        exec_map={"git diff --name-only": "src/lib/gone.ts\n"},
        files=set(),
    )
    result = hook.run(**{k: v for k, v in m.items() if k != "state"})
    assert result["exitCode"] == 0


def test_auto_disables_after_three_failures():
    m = _make(
        exec_map={
            "git merge-base": "base",
            "git rev-parse": "head",
            "git diff --name-only base HEAD": "src/lib/foo.ts\n",
            "find src tests": "",
        },
        files={"src/lib/foo.ts"},
    )
    deps = {k: v for k, v in m.items() if k != "state"}
    for i in range(3):
        result = hook.run(**deps)
    assert "AUTO-DISABLE" in result["message"]
    assert "/tmp/disabled" in m["state"]["written"]


def test_suspended_when_disabled_file_exists():
    m = _make(disable=True)
    result = hook.run(**{k: v for k, v in m.items() if k != "state"})
    assert result["exitCode"] == 0
