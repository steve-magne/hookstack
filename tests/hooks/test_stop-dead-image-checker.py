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


def test_scans_all_md_and_mdx_files():
    # Le hook doit scanner tous les .md et .mdx du repo (et pas seulement
    # un sous-ensemble). On trace les fichiers lus pour vérifier.
    read_paths = []

    def read_file(p):
        read_paths.append(p)
        return ""

    deps = {
        "project_dir": "/proj",
        "exists": lambda p: p in {"/proj", "/proj/a.md", "/proj/b.mdx", "/proj/c.ts"},
        "readdir": lambda d: (
            [
                _Entry("a.md", False),
                _Entry("b.mdx", False),
                _Entry("c.ts", False),
            ]
            if d == "/proj"
            else []
        ),
        "read_file": read_file,
    }
    hook.run(None, **deps)
    assert "/proj/a.md" in read_paths
    assert "/proj/b.mdx" in read_paths
    assert "/proj/c.ts" not in read_paths


def test_skips_node_modules_git_claude_next_dirs():
    # walk_md doit ignorer node_modules, .git, .claude, .next (risque/perf).
    readdir = []

    def tracked_readdir(d):
        readdir.append(d)
        return []

    deps = {
        "project_dir": "/proj",
        "exists": lambda p: True,
        "readdir": lambda d: (
            [
                _Entry("node_modules", True),
                _Entry(".git", True),
                _Entry(".claude", True),
                _Entry(".next", True),
                _Entry("README.md", False),
            ]
            if d == "/proj"
            else []
        ),
        "read_file": lambda p: "",
    }
    # On trace les dossiers visités via l'instrumentation précédente.
    deps["readdir"] = tracked_readdir
    hook.run(None, **deps)
    assert "/proj/node_modules" not in readdir
    assert "/proj/.git" not in readdir
    assert "/proj/.claude" not in readdir
    assert "/proj/.next" not in readdir
