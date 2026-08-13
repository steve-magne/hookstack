import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "guard-push-main.py"
_spec = importlib.util.spec_from_file_location("guard_push_main", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _cmd(command):
    return {"tool_input": {"command": command}}


def test_blocks_force_push_main():
    assert hook.run(_cmd("git push --force origin main"))["decision"] == "block"


def test_blocks_short_f_flag_to_main():
    assert hook.run(_cmd("git push -f origin master"))["decision"] == "block"


def test_blocks_force_with_lease_main():
    assert hook.run(_cmd("git push --force-with-lease origin main"))["decision"] == "block"


def test_allows_force_push_feature_branch():
    assert hook.run(_cmd("git push --force origin feature/x")) is None


def test_allows_normal_push_main():
    assert hook.run(_cmd("git push origin main")) is None


def test_allows_non_git_command():
    assert hook.run(_cmd("npm run build")) is None
