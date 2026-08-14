import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "stop-dead-image-checker.py"
_spec = importlib.util.spec_from_file_location("stop_dead_image_checker", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


class _Entry:
    def __init__(self, name, is_dir):
        self.name = name
        self._is_dir = is_dir

    def is_dir(self):
        return self._is_dir


def make_fs(files=None, dirs=None, public_files=None):
    files = dict(files or {})
    for p in public_files or []:
        files[p] = ""
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


def test_returns_none_without_images_in_md():
    deps = make_fs(files={"/proj/README.md": "# Titre\n[lien](./doc.md)"})
    assert hook.run(**deps) is None


def test_returns_none_when_all_relative_images_exist():
    deps = make_fs(
        files={"/proj/README.md": "![logo](./assets/logo.png)", "/proj/assets/logo.png": ""},
        dirs=["/proj/assets"],
    )
    assert hook.run(**deps) is None


def test_returns_message_for_broken_relative_image():
    deps = make_fs(files={"/proj/README.md": "![manquant](./assets/missing.png)"})
    r = hook.run(**deps)
    assert "[dead-image-checker]" in r["message"]
    assert "README.md" in r["message"]
    assert "./assets/missing.png" in r["message"]


def test_ignores_http_images():
    deps = make_fs(files={"/proj/README.md": "![ext](https://example.com/image.png)"})
    assert hook.run(**deps) is None


def test_ignores_data_uris():
    deps = make_fs(files={"/proj/README.md": "![inline](data:image/png;base64,abc123)"})
    assert hook.run(**deps) is None


def test_resolves_absolute_paths_from_public():
    deps = make_fs(
        files={"/proj/README.md": "![heatmap](/hooks-timeline.svg)"},
        public_files=["/proj/public/hooks-timeline.svg"],
        dirs=["/proj/public"],
    )
    assert hook.run(**deps) is None


def test_reports_broken_absolute_path():
    deps = make_fs(files={"/proj/README.md": "![missing](/assets/ghost.png)"})
    r = hook.run(**deps)
    assert "[dead-image-checker]" in r["message"]
    assert "/assets/ghost.png" in r["message"]


def test_does_not_flag_text_links_as_images():
    deps = make_fs(files={"/proj/README.md": "[lien](./absent.md)"})
    assert hook.run(**deps) is None


def test_ignores_images_in_code_blocks():
    deps = make_fs(files={"/proj/README.md": "```\n![cassé](./missing.png)\n```"})
    assert hook.run(**deps) is None


def test_ignores_images_in_inline_code_spans():
    deps = make_fs(files={"/proj/README.md": "Syntaxe : `![alt](src)` dans les Markdown"})
    assert hook.run(**deps) is None


def test_reports_multiple_broken_images():
    deps = make_fs(
        files={
            "/proj/README.md": "![a](./img/a.png)\n![b](./img/b.png)",
            "/proj/docs/guide.md": "![c](./screens/c.png)",
        },
        dirs=["/proj/docs"],
    )
    r = hook.run(**deps)
    assert "3 broken" in r["message"]
