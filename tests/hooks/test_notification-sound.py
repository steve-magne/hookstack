import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "notification-sound.py"
_spec = importlib.util.spec_from_file_location("notification_sound", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_resolve_activate_bundle_known_terminals():
    assert hook.resolve_activate_bundle("iTerm.app") == "com.googlecode.iterm2"
    assert hook.resolve_activate_bundle("Apple_Terminal") == "com.apple.Terminal"
    assert hook.resolve_activate_bundle("vscode") == "com.microsoft.VSCode"


def test_resolve_activate_bundle_falls_back_to_claude_app():
    assert hook.resolve_activate_bundle(None) == "com.anthropic.claudefordesktop"
    assert hook.resolve_activate_bundle("some-unknown-terminal") == "com.anthropic.claudefordesktop"


def test_uses_terminal_notifier_with_bundle_id_on_darwin():
    calls = []
    hook.run(
        {},
        exec_cmd=lambda c: calls.append(c),
        has_terminal_notifier=lambda: True,
        platform="darwin",
        term_program="iTerm.app",
    )
    assert any("terminal-notifier" in c for c in calls)
    assert any("com.googlecode.iterm2" in c for c in calls)


def test_uses_claude_app_bundle_when_no_term_program():
    calls = []
    hook.run(
        {},
        exec_cmd=lambda c: calls.append(c),
        has_terminal_notifier=lambda: True,
        platform="darwin",
        term_program="",
    )
    assert any("com.anthropic.claudefordesktop" in c for c in calls)


def test_falls_back_to_afplay_and_osascript_without_terminal_notifier():
    calls = []
    hook.run(
        {},
        exec_cmd=lambda c: calls.append(c),
        has_terminal_notifier=lambda: False,
        platform="darwin",
    )
    assert any("Glass.aiff" in c for c in calls)
    assert any("display notification" in c for c in calls)


def test_plays_paplay_on_linux():
    calls = []
    hook.run({}, exec_cmd=lambda c: calls.append(c), platform="linux")
    assert calls


def test_plays_powershell_beep_on_windows():
    calls = []
    hook.run({}, exec_cmd=lambda c: calls.append(c), platform="win32")
    assert any("powershell" in c for c in calls)


def test_returns_none_non_blocking():
    assert hook.run(
        {},
        exec_cmd=lambda c: None,
        has_terminal_notifier=lambda: True,
        platform="darwin",
    ) is None


def test_does_not_raise_when_exec_fails():
    def exec_cmd(c):
        raise RuntimeError("commande absente")

    hook.run(
        {},
        exec_cmd=exec_cmd,
        has_terminal_notifier=lambda: True,
        platform="darwin",
    )


def test_plays_nothing_on_unknown_platform():
    calls = []
    hook.run({}, exec_cmd=lambda c: calls.append(c), platform="freebsd")
    assert calls == []
