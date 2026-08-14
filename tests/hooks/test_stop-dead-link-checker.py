import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "stop-dead-link-checker.py"
_spec = importlib.util.spec_from_file_location("stop_dead_link_checker", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


class _Entry:
    def __init__(self, name, is_dir):
        self.name = name
        self._is_dir = is_dir

    def is_dir(self):
        return self._is_dir


def make_fs(files=None, dirs=None):
    files = files or {}
    dirs = dirs or []

    def exists(p):
        return p in files or p in dirs or p == "/proj"

    def readdir(directory):
        entries = []
        for fp in files:
            if fp.startswith(f"{directory}/"):
                rel = fp[len(directory) + 1 :]
                if "/" not in rel:
                    entries.append(_Entry(rel, False))
        for d in dirs:
            if d.startswith(f"{directory}/") and "/" not in d[len(directory) + 1 :]:
                entries.append(_Entry(d[len(directory) + 1 :], True))
        return entries

    return {
        "project_dir": "/proj",
        "exists": exists,
        "readdir": readdir,
        "read_file": lambda p: files[p] if p in files else (_ for _ in ()).throw(FileNotFoundError(p)),
    }


def test_returns_none_without_md_files():
    assert hook.run(**make_fs(files={"/proj/src/index.ts": ""})) is None


def test_returns_none_when_all_relative_links_exist():
    deps = make_fs(
        files={"/proj/README.md": "[guide](./docs/guide.md)", "/proj/docs/guide.md": "# Guide"},
        dirs=["/proj/docs"],
    )
    assert hook.run(**deps) is None


def test_returns_message_for_broken_relative_link():
    deps = make_fs(files={"/proj/README.md": "[missing](./docs/missing.md)"})
    r = hook.run(**deps)
    assert "[dead-link-checker]" in r["message"]
    assert "README.md" in r["message"]
    assert "./docs/missing.md" in r["message"]


def test_ignores_http_links():
    deps = make_fs(files={"/proj/README.md": "[ext](https://example.com/404)"})
    assert hook.run(**deps) is None


def test_ignores_pure_anchors():
    deps = make_fs(files={"/proj/README.md": "[sec](#installation)"})
    assert hook.run(**deps) is None


def test_ignores_mailto_links():
    deps = make_fs(files={"/proj/README.md": "[email](mailto:foo@bar.com)"})
    assert hook.run(**deps) is None


def test_ignores_images():
    deps = make_fs(files={"/proj/README.md": "![logo](./assets/logo.png)"})
    assert hook.run(**deps) is None


def test_resolves_okf_absolute_links():
    deps = make_fs(
        files={
            "/proj/okf/vision/mission.md": "[personas](/vision/personas.md)",
            "/proj/okf/vision/personas.md": "# Personas",
        },
        dirs=["/proj/okf", "/proj/okf/vision"],
    )
    assert hook.run(**deps) is None


def test_reports_missing_okf_absolute_link():
    deps = make_fs(
        files={"/proj/okf/meta/porting.md": "[x](/chemin-inexistant.md)"},
        dirs=["/proj/okf", "/proj/okf/meta"],
    )
    r = hook.run(**deps)
    assert "/chemin-inexistant.md" in r["message"]


def test_ignores_links_inside_code_fences():
    deps = make_fs(
        files={
            "/proj/okf/meta/porting.md": "```markdown\nLier via [texte](/chemin.md).\n```\n"
        },
        dirs=["/proj/okf", "/proj/okf/meta"],
    )
    assert hook.run(**deps) is None
