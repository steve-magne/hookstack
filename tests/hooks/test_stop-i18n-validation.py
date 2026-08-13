import importlib.util
import json
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "i18n-validation.py"
_spec = importlib.util.spec_from_file_location("i18n_validation", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_returns_none_with_less_than_2_files():
    assert hook.run(exec_cmd=lambda c: "./locales/fr.json", project_dir="/p") is None


def test_detects_missing_keys():
    exec_cmd = lambda c: "./locales/fr.json\n./locales/en.json"  # noqa: E731
    read_file = lambda p: '{"a":1,"b":2}' if "fr.json" in p else '{"a":1}'  # noqa: E731
    r = hook.run(exec_cmd=exec_cmd, read_file=read_file, project_dir="/p")
    assert len(r["issues"]) > 0
    assert "manque" in r["message"]


def test_reports_consistency():
    exec_cmd = lambda c: "./locales/fr.json\n./locales/en.json"  # noqa: E731
    read_file = lambda p: '{"a":1}'  # noqa: E731
    r = hook.run(exec_cmd=exec_cmd, read_file=read_file, project_dir="/p")
    assert r["issues"] == []
    assert "cohérents" in r["message"]


def test_returns_none_on_timeout():
    def exec_cmd(c):
        raise RuntimeError("spawnSync /bin/sh ETIMEDOUT")

    assert hook.run(exec_cmd=exec_cmd, project_dir="/p") is None


def test_find_i18n_json_ignores_skipped_dirs(tmp_path):
    (tmp_path / "src" / "locales").mkdir(parents=True)
    (tmp_path / "src" / "locales" / "fr.json").write_text('{"a":1}')
    (tmp_path / "src" / "locales" / "en.json").write_text('{"a":1}')
    (tmp_path / "node_modules" / "pkg" / "locales").mkdir(parents=True)
    (tmp_path / "node_modules" / "pkg" / "locales" / "fr.json").write_text('{"a":1}')
    (tmp_path / ".claude" / "worktrees" / "x" / "src" / "locales").mkdir(parents=True)
    (tmp_path / ".claude" / "worktrees" / "x" / "src" / "locales" / "fr.json").write_text('{"a":1}')
    (tmp_path / ".git" / "messages").mkdir(parents=True)
    (tmp_path / ".git" / "messages" / "en.json").write_text('{"a":1}')

    found = hook.find_i18n_json(str(tmp_path))
    assert "./src/locales/fr.json" in found
    assert "./src/locales/en.json" in found
    assert not any("node_modules" in f for f in found)
    assert not any(".claude" in f for f in found)
    assert not any(".git" in f for f in found)


def test_find_i18n_json_ignores_outside_locale_dirs(tmp_path):
    (tmp_path / "package.json").write_text('{"a":1}')
    assert hook.find_i18n_json(str(tmp_path)) == []


def test_run_native_walk_end_to_end(tmp_path):
    (tmp_path / "locales").mkdir()
    (tmp_path / "locales" / "fr.json").write_text(json.dumps({"a": 1, "b": 2}))
    (tmp_path / "locales" / "en.json").write_text(json.dumps({"a": 1}))
    r = hook.run(project_dir=str(tmp_path))
    assert len(r["issues"]) > 0
