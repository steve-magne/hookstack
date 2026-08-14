import importlib.util
import subprocess
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "task-completed-test-gate.py"
_spec = importlib.util.spec_from_file_location("task_completed_test_gate", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _ok(cmd, **kwargs):
    return None


def _fail():
    def fail(cmd, **kwargs):
        raise subprocess.CalledProcessError(1, cmd, output="2 failed, 3 passed\n")

    return fail


def _exists(*names):
    def exists(f):
        return f in names

    return exists


def test_passes_when_tests_succeed():
    assert hook.run(
        {"task_subject": "x"},
        exec_cmd=_ok,
        exists=_exists("pyproject.toml", "tests"),
        project_dir="/repo",
    ) is None


def test_blocks_when_tests_fail():
    result = hook.run(
        {"task_subject": "Feature X"},
        exec_cmd=_fail(),
        exists=_exists("pyproject.toml", "tests"),
        project_dir="/repo",
    )
    assert result["exitCode"] == 2
    assert "Feature X" in result["message"]
    assert "2 failed" in result["message"]


def test_arms_with_pytest_ini_without_tests_dir():
    calls = []

    def ok(cmd, **kwargs):
        calls.append(cmd)
        return None

    hook.run(
        {"task_subject": "x"},
        exec_cmd=ok,
        exists=_exists("pyproject.toml", "pytest.ini"),
        project_dir="/repo",
    )
    assert calls == ["uv run pytest -q"]


def test_disarmed_without_tests():
    calls = []

    def ok(cmd, **kwargs):
        calls.append(cmd)
        return None

    assert (
        hook.run(
            {"task_subject": "x"},
            exec_cmd=ok,
            exists=_exists("pyproject.toml"),
            project_dir="/repo",
        )
        is None
    )
    assert calls == []


def test_disarmed_on_non_python_project():
    assert (
        hook.run(
            {"task_subject": "x"},
            exec_cmd=_ok,
            exists=_exists("package.json", "tests"),
            project_dir="/repo",
        )
        is None
    )


def test_arms_with_pytest_markers_other_than_pyproject():
    # projet Python sans pyproject.toml mais avec pytest.ini → pytest armé.
    calls = []

    def ok(cmd, **kwargs):
        calls.append(cmd)
        return None

    assert (
        hook.run(
            {"task_subject": "x"},
            exec_cmd=ok,
            exists=_exists("pytest.ini"),
            project_dir="/repo",
        )
        is None
    )
    assert calls == ["uv run pytest -q"]


def test_arms_with_alternative_test_directory_name():
    # `test/` (singulier) — un projet legacy peut utiliser ce nom.
    calls = []

    def ok(cmd, **kwargs):
        calls.append(cmd)
        return None

    assert (
        hook.run(
            {"task_subject": "x"},
            exec_cmd=ok,
            exists=_exists("pyproject.toml", "test"),
            project_dir="/repo",
        )
        is None
    )
    assert calls == ["uv run pytest -q"]


def test_failure_message_truncates_long_output():
    # pytest peut sortir énormément de texte (verbose, stack traces) — la
    # sortie est tronquée pour éviter de saturer le transcript.
    long_out = "x" * 5000

    def fail(cmd, **kwargs):
        raise subprocess.CalledProcessError(1, cmd, output=long_out)

    result = hook.run(
        {"task_subject": "x"},
        exec_cmd=fail,
        exists=_exists("pyproject.toml", "tests"),
        project_dir="/repo",
    )
    assert result["exitCode"] == 2
    assert len(result["message"]) <= 2000  # le hook coupe à ~800


def test_uses_pytest_ini_over_tests_dir():
    # Si pytest.ini existe, le hook s'arme même sans dossier tests/.
    calls = []

    def ok(cmd, **kwargs):
        calls.append(cmd)
        return None

    assert (
        hook.run(
            {"task_subject": "x"},
            exec_cmd=ok,
            exists=_exists("pyproject.toml", "pytest.ini"),  # pas de "tests"
            project_dir="/repo",
        )
        is None
    )
    assert calls == ["uv run pytest -q"]


def test_missing_subject_uses_empty_string():
    # task_subject absent — ne doit pas crash (le hook affiche une chaîne vide).
    def fail(cmd, **kwargs):
        raise subprocess.CalledProcessError(1, cmd, output="1 failed\n")

    result = hook.run(
        {},
        exec_cmd=fail,
        exists=_exists("pyproject.toml", "tests"),
        project_dir="/repo",
    )
    assert result["exitCode"] == 2
    assert '""' in result["message"]
