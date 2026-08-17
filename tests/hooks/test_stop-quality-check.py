import importlib.util
import subprocess
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "quality-check.py"
_spec = importlib.util.spec_from_file_location("quality_check", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _make(has_pyproject=True, exec_results=None, changed=None):
    exec_results = exec_results or {}
    calls = []

    def exec_cmd(cmd, **kwargs):
        calls.append(cmd)
        for key, behavior in exec_results.items():
            if key in cmd:
                if isinstance(behavior, Exception):
                    raise behavior
        return None

    return {
        "exists": lambda f: has_pyproject if f == "pyproject.toml" else False,
        "exec_cmd": exec_cmd,
        "changed": changed if changed is not None else ["app/main.py"],
        "calls": calls,
    }


def _ruff_fail():
    return subprocess.CalledProcessError(1, "uv run ruff check .", output="2 lint errors\n")


def test_zero_checks_when_only_docs_change():
    m = _make(changed=["README.md"])
    result = hook.run(**{k: v for k, v in m.items() if k != "calls"})
    assert result["checks"] == 0
    assert m["calls"] == []


def test_zero_checks_without_pyproject():
    m = _make(has_pyproject=False)
    result = hook.run(**{k: v for k, v in m.items() if k != "calls"})
    assert result["checks"] == 0
    assert m["calls"] == []


def test_runs_ruff_and_pyright_on_touched_py():
    m = _make()
    result = hook.run(**{k: v for k, v in m.items() if k != "calls"})
    assert result["checks"] == 2
    assert result["failed"] == 0
    assert any('uv run ruff check "app/main.py"' in c for c in m["calls"])
    assert any('uv run pyright "app/main.py"' in c for c in m["calls"])


def test_config_only_change_runs_whole_repo():
    m = _make(changed=["pyproject.toml"])
    hook.run(**{k: v for k, v in m.items() if k != "calls"})
    assert any(c.endswith("uv run ruff check .") for c in m["calls"])
    assert any(c == "uv run pyright" for c in m["calls"])


def test_failed_ruff_fails_gate():
    m = _make(exec_results={"ruff": _ruff_fail()})
    result = hook.run(**{k: v for k, v in m.items() if k != "calls"})
    assert result["failed"] >= 1
    assert "✗ Ruff" in result["message"]


def test_runs_outside_git(changed_none=True):
    m = _make(changed=None)
    result = hook.run(**{k: v for k, v in m.items() if k != "calls"})
    assert result["checks"] == 2


def test_zero_checks_for_doc_only_changes():
    # Changements purement Markdown/assets — la gate n'a rien à vérifier.
    m = _make(changed=["README.md", "docs/logo.svg"])
    result = hook.run(**{k: v for k, v in m.items() if k != "calls"})
    assert result["checks"] == 0
    assert result["failed"] == 0
    assert m["calls"] == []


def test_pyright_failure_marks_failed():
    # Une erreur pyright fait passer le gate en échec (et la reason le mentionne).
    def pyright_fail(cmd, **kwargs):
        raise subprocess.CalledProcessError(1, cmd, output="1 type error in main.py\n")

    result = hook.run(
        exec_cmd=_exec_with(
            {"pyright": pyright_fail, "ruff": lambda c, **kw: None}
        ),
        exists=lambda f: f == "pyproject.toml",
        changed=["app/main.py"],
    )
    assert result["failed"] >= 1
    assert "Pyright" in result["message"]


# factorisé : exec_cmd qui matche préfixe → behavior (callable ou exception)
def _exec_with(mapping):
    calls = []

    def exec_cmd(cmd, **kwargs):
        calls.append(cmd)
        for key, behavior in mapping.items():
            if key in cmd:
                if isinstance(behavior, Exception):
                    raise behavior
                return behavior(cmd, **kwargs)
        return None

    return exec_cmd


def test_message_empty_when_no_checks():
    # Pas de checks lancés → message vide (le hook n'écrit rien dans le transcript).
    m = _make(changed=["docs/article.md", "assets/icon.svg"], has_pyproject=False)
    result = hook.run(**{k: v for k, v in m.items() if k != "calls"})
    assert result["message"] == ""
    assert result["checks"] == 0


def test_runs_pytest_marker_in_change_list_goes_through():
    # pytest.ini configuration file alone → on lance sur tout le repo (pas de
    # fichiers .py touchés dans changed).
    m = _make(changed=["pytest.ini"])
    hook.run(**{k: v for k, v in m.items() if k != "calls"})
    assert any(c.endswith("uv run ruff check .") for c in m["calls"])
    assert any(c == "uv run pyright" for c in m["calls"])


def test_exec_cmd_propagates_timeout():
    # Le callable par défaut _exec passe timeout=60 — un appel conforme doit
    # recevoir une chaîne valide, pas exploser dans subprocess.
    captured = {}

    def fake_exec(cmd, timeout=60):
        captured["timeout"] = timeout
        return None

    hook.run(
        exec_cmd=fake_exec,
        exists=lambda f: f == "pyproject.toml",
        changed=["app/main.py"],
    )
    assert captured.get("timeout") == 60


def test_multiple_touched_py_files_both_invocations():
    # Plusieurs .py modifiés → ruff et pyright reçoivent la liste complète quotée.
    m = _make(changed=["a.py", "b.py", "c.py"])
    hook.run(**{k: v for k, v in m.items() if k != "calls"})
    joined_paths_call = [c for c in m["calls"] if "ruff" in c]
    assert any('"a.py"' in c and '"b.py"' in c and '"c.py"' in c for c in joined_paths_call)


def test_full_check_runs_even_for_doc_only_changes(monkeypatch):
    monkeypatch.setenv("HOOKSTACK_FULL_CHECK", "1")
    m = _make(changed=["README.md"])
    result = hook.run(**{k: v for k, v in m.items() if k != "calls"})
    assert result["checks"] >= 2
    assert any("ruff" in c for c in m["calls"])
