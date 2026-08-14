import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "env-gitignore-guard.py"
_spec = importlib.util.spec_from_file_location("env_gitignore_guard", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _deps(gitignore_content=None, gitignore_exists=True):
    return {
        "read_file": lambda p, enc: gitignore_content or "",
        "file_exists": lambda p: gitignore_exists if p.endswith(".gitignore") else True,
    }


def test_warns_when_env_not_covered():
    result = hook.run(
        {"tool_input": {"file_path": "/proj/.env"}},
        **_deps(gitignore_content="node_modules/\n"),
    )
    assert "gitignore" in result["message"]


def test_silent_when_covered_by_dotenv_star():
    assert (
        hook.run(
            {"tool_input": {"file_path": "/proj/.env.local"}},
            **_deps(gitignore_content=".env*\n"),
        )
        is None
    )


def test_silent_for_env_example():
    assert (
        hook.run(
            {"tool_input": {"file_path": "/proj/.env.example"}},
            **_deps(gitignore_content=""),
        )
        is None
    )


def test_silent_without_gitignore_file():
    assert (
        hook.run(
            {"tool_input": {"file_path": "/proj/.env"}},
            **_deps(gitignore_content="", gitignore_exists=False),
        )
        is not None
    )  # pas de .gitignore → on avertit


def test_ignores_non_env_file():
    assert (
        hook.run(
            {"tool_input": {"file_path": "/proj/src/main.py"}},
            **_deps(gitignore_content=""),
        )
        is None
    )
