import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "stop-sound.py"
_spec = importlib.util.spec_from_file_location("stop_sound", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_plays_hero_aiff_on_macos():
    calls = []
    hook.run(exec_cmd=lambda c: calls.append(c), platform="darwin")
    assert any("Hero.aiff" in c for c in calls)


def test_displays_macos_notification():
    calls = []
    hook.run(exec_cmd=lambda c: calls.append(c), platform="darwin")
    assert any("display notification" in c for c in calls)


def test_plays_paplay_on_linux():
    calls = []
    hook.run(exec_cmd=lambda c: calls.append(c), platform="linux")
    assert calls


def test_plays_powershell_beep_on_windows():
    calls = []
    hook.run(exec_cmd=lambda c: calls.append(c), platform="win32")
    assert any("powershell" in c for c in calls)


def test_returns_none_non_blocking():
    assert hook.run(exec_cmd=lambda c: None, platform="darwin") is None


def test_does_not_raise_when_exec_fails():
    def exec_cmd(c):
        raise RuntimeError("afplay absent")

    hook.run(exec_cmd=exec_cmd, platform="darwin")


def test_plays_nothing_on_unknown_platform():
    calls = []
    hook.run(exec_cmd=lambda c: calls.append(c), platform="freebsd")
    assert calls == []
