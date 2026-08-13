import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "block-destructive.py"
_spec = importlib.util.spec_from_file_location("block_destructive", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _cmd(command):
    return {"tool_input": {"command": command}}


def test_blocks_rm_rf_root():
    assert hook.run(_cmd("rm -rf /"))["decision"] == "block"


def test_blocks_rm_rf_tilde():
    assert hook.run(_cmd("rm -rf ~/foo"))["decision"] == "block"


def test_blocks_drop_table():
    assert hook.run(_cmd("DROP TABLE users"))["decision"] == "block"


def test_blocks_dd_disk():
    assert hook.run(_cmd("dd if=/dev/zero of=/dev/sda"))["decision"] == "block"


def test_allows_rm_specific_file():
    assert hook.run(_cmd("rm -rf /tmp/build")) is None


def test_allows_documented_pattern_in_quotes():
    # Mention documentaire entre guillemets → ne doit pas être bloquée.
    assert hook.run(_cmd('git commit -m "do not rm -rf /"')) is None


def test_reset_hard_to_other_target_always_blocked():
    result = hook.run(_cmd("git reset --hard HEAD~1"))
    assert result["decision"] == "block"
    assert "HEAD~1" in result["reason"]


def test_reset_hard_to_head_with_dirty_tree_blocked():
    result = hook.run(_cmd("git reset --hard"), git_status=lambda: " M src/main.py\n")
    assert result["decision"] == "block"


def test_reset_hard_to_head_with_clean_tree_allowed():
    assert hook.run(_cmd("git reset --hard"), git_status=lambda: "") is None


def test_allows_anodyne():
    assert hook.run(_cmd("ls -la")) is None
