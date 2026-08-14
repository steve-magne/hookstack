import importlib.util
from pathlib import Path

_HOOK = (
    Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "file-changed-docs-consistency.py"
)
_spec = importlib.util.spec_from_file_location("file_changed_docs_consistency", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)

PROJECT = "/p"


def _deps(readmes=None):
    readmes = readmes or ["README.md", "packages/cli/README.md"]
    return {
        "project_dir": PROJECT,
        "exists": lambda p: p == f"{PROJECT}/packages" or any(
            p == f"{PROJECT}/{r}" for r in readmes
        ),
        "readdir": lambda p: ["cli"] if p == f"{PROJECT}/packages" else [],
    }


def test_ignores_non_readme_file():
    assert hook.run({"file_path": "/p/src/a.ts"}, **_deps()) is None


def test_ignores_unlink():
    assert hook.run({"file_path": "/p/README.md", "event": "unlink"}, **_deps()) is None


def test_lists_sibling_surfaces_when_root_readme_changes():
    r = hook.run({"file_path": "/p/README.md"}, **_deps())
    ctx = r["hookSpecificOutput"]["additionalContext"]
    assert "packages/cli/README.md" in ctx
    assert "README.md changed. These sibling docs share the same product promise and must stay consistent (CLI examples, slugs, wording): README.md" not in ctx


def test_excludes_changed_readme_from_siblings():
    r = hook.run({"file_path": "/p/packages/cli/README.md"}, **_deps())
    ctx = r["hookSpecificOutput"]["additionalContext"]
    assert "packages/cli/README.md changed" in ctx
    assert ": README.md." in ctx


def test_returns_none_without_sibling_surface():
    assert hook.run({"file_path": "/p/README.md"}, **_deps(readmes=["README.md"])) is None


def test_find_sibling_readmes_finds_root_and_packages():
    assert hook.find_sibling_readmes(**_deps()) == ["README.md", "packages/cli/README.md"]


def test_find_sibling_readmes_works_without_packages_dir():
    d = {
        "project_dir": PROJECT,
        "exists": lambda p: p == f"{PROJECT}/README.md",
        "readdir": lambda p: [],
    }
    assert hook.find_sibling_readmes(**d) == ["README.md"]
