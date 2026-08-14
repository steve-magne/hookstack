import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "setup-worktree-env.py"
_spec = importlib.util.spec_from_file_location("setup_worktree_env", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)

MAIN = "/repos/hookstack"
WORKTREE = "/repos/hookstack-wt"


def _make_exec(main=MAIN, wt=WORKTREE):
    def exec_cmd(cmd):
        if cmd == "git worktree list":
            return f"{main}  abc1234 [main]\n{wt}  def5678 [feature]"
        if cmd == "git rev-parse --show-toplevel":
            return wt
        return ""

    return exec_cmd


def _no_scan(*args, **kwargs):
    return []


# ─── Gardes d'entrée ─────────────────────────────────────────────────────────


def test_does_nothing_if_worktree_list_empty():
    copies = []
    hook.run(
        exec_cmd=lambda cmd: "",
        exists=lambda p: False,
        copy=lambda s, d: copies.append((s, d)),
        mkdir=lambda p, **kw: None,
        scan_env_files=_no_scan,
    )
    assert copies == []


def test_does_nothing_if_main_dir_equals_worktree_dir():
    copies = []
    hook.run(
        exec_cmd=_make_exec(MAIN, MAIN),
        exists=lambda p: False,
        copy=lambda s, d: copies.append((s, d)),
        mkdir=lambda p, **kw: None,
        scan_env_files=_no_scan,
    )
    assert copies == []


# ─── Liste statique racine ────────────────────────────────────────────────────


def test_copies_env_present_in_main_absent_in_worktree():
    copies = []
    hook.run(
        exec_cmd=_make_exec(),
        exists=lambda p: p == f"{MAIN}/.env",
        copy=lambda s, d: copies.append((s, d)),
        mkdir=lambda p, **kw: None,
        scan_env_files=_no_scan,
    )
    assert copies == [(f"{MAIN}/.env", f"{WORKTREE}/.env")]


def test_copies_env_local_and_dev_local():
    copies = []
    existing = {f"{MAIN}/.env.local", f"{MAIN}/.env.development.local"}
    hook.run(
        exec_cmd=_make_exec(),
        exists=lambda p: p in existing,
        copy=lambda s, d: copies.append((s, d)),
        mkdir=lambda p, **kw: None,
        scan_env_files=_no_scan,
    )
    copied_srcs = [s.replace(f"{MAIN}/", "") for s, _ in copies]
    assert ".env.local" in copied_srcs
    assert ".env.development.local" in copied_srcs
    assert len(copies) == 2


def test_copies_envrc():
    copies = []
    hook.run(
        exec_cmd=_make_exec(),
        exists=lambda p: p == f"{MAIN}/.envrc",
        copy=lambda s, d: copies.append((s, d)),
        mkdir=lambda p, **kw: None,
        scan_env_files=_no_scan,
    )
    assert copies == [(f"{MAIN}/.envrc", f"{WORKTREE}/.envrc")]


def test_copies_rails_master_key_and_creates_intermediate_dir():
    copies = []
    mkdirs = []
    hook.run(
        exec_cmd=_make_exec(),
        exists=lambda p: p == f"{MAIN}/config/master.key",
        copy=lambda s, d: copies.append((s, d)),
        mkdir=lambda p, **kw: mkdirs.append((p, kw)),
        scan_env_files=_no_scan,
    )
    assert (f"{WORKTREE}/config", {"exist_ok": True}) in mkdirs
    assert (f"{MAIN}/config/master.key", f"{WORKTREE}/config/master.key") in copies


def test_does_not_copy_if_already_present_in_worktree():
    copies = []
    hook.run(
        exec_cmd=_make_exec(),
        exists=lambda p: True,
        copy=lambda s, d: copies.append((s, d)),
        mkdir=lambda p, **kw: None,
        scan_env_files=_no_scan,
    )
    assert copies == []


def test_does_not_copy_if_source_absent():
    copies = []
    hook.run(
        exec_cmd=_make_exec(),
        exists=lambda p: False,
        copy=lambda s, d: copies.append((s, d)),
        mkdir=lambda p, **kw: None,
        scan_env_files=_no_scan,
    )
    assert copies == []


def test_covers_staging_and_production_variants():
    copies = []
    files = [
        ".env.staging",
        ".env.staging.local",
        ".env.production",
        ".env.production.local",
    ]
    existing = {f"{MAIN}/{f}" for f in files}
    hook.run(
        exec_cmd=_make_exec(),
        exists=lambda p: p in existing,
        copy=lambda s, d: copies.append((s, d)),
        mkdir=lambda p, **kw: None,
        scan_env_files=_no_scan,
    )
    copied_srcs = [s.replace(f"{MAIN}/", "") for s, _ in copies]
    for f in files:
        assert f in copied_srcs


# ─── Scan monorepo ────────────────────────────────────────────────────────────


def test_copies_env_files_found_in_subdirs():
    copies = []
    sub_files = ["apps/web/.env", "apps/api/.env.local", "packages/utils/.env"]
    hook.run(
        exec_cmd=_make_exec(),
        exists=lambda p: p.startswith(f"{MAIN}/"),
        copy=lambda s, d: copies.append((s, d)),
        mkdir=lambda p, **kw: None,
        scan_env_files=lambda d: sub_files,
    )
    copied_srcs = [s.replace(f"{MAIN}/", "") for s, _ in copies]
    assert "apps/web/.env" in copied_srcs
    assert "apps/api/.env.local" in copied_srcs
    assert "packages/utils/.env" in copied_srcs


def test_does_not_copy_monorepo_file_already_in_worktree():
    copies = []
    hook.run(
        exec_cmd=_make_exec(),
        exists=lambda p: True,
        copy=lambda s, d: copies.append((s, d)),
        mkdir=lambda p, **kw: None,
        scan_env_files=lambda d: ["frontend/.env"],
    )
    assert copies == []


def test_dedupes_scan_results_against_root_files():
    copies = []
    hook.run(
        exec_cmd=_make_exec(),
        exists=lambda p: p.startswith(f"{MAIN}/"),
        copy=lambda s, d: copies.append((s, d)),
        mkdir=lambda p, **kw: None,
        scan_env_files=lambda d: [".env", "frontend/.env"],
    )
    copied_srcs = [s.replace(f"{MAIN}/", "") for s, _ in copies]
    assert copied_srcs.count(".env") == 1
    assert "frontend/.env" in copied_srcs


def test_creates_intermediate_dirs_for_monorepo_files():
    mkdirs = []
    hook.run(
        exec_cmd=_make_exec(),
        exists=lambda p: p.startswith(f"{MAIN}/") and not p.startswith(f"{WORKTREE}/"),
        copy=lambda s, d: None,
        mkdir=lambda p, **kw: mkdirs.append((p, kw)),
        scan_env_files=lambda d: ["apps/web/.env"],
    )
    assert (f"{WORKTREE}/apps/web", {"exist_ok": True}) in mkdirs


def test_continues_when_scan_returns_empty():
    copies = []
    hook.run(
        exec_cmd=_make_exec(),
        exists=lambda p: p == f"{MAIN}/.env",
        copy=lambda s, d: copies.append((s, d)),
        mkdir=lambda p, **kw: None,
        scan_env_files=lambda d: [],
    )
    assert copies == [(f"{MAIN}/.env", f"{WORKTREE}/.env")]
