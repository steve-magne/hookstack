import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "notification-sound.py"
_spec = importlib.util.spec_from_file_location("notification_sound", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


# ── resolveActivateBundle —mirroir des 5 tests unitaires du .test.mjs ────────
# Chaque cas est testé séparément (vs agrégé) pour rester 1:1 avec la version
# JS : un terminal ajouté dans la table TERMINAL_BUNDLE_IDS force la mise à
# jour des deux fichiers de test en même temps, ce qui maintient la parité.

def test_resolve_activate_bundle_iterm_app():
    # iTerm2 : bundle id com.googlecode.iterm2.
    assert hook.resolve_activate_bundle("iTerm.app") == "com.googlecode.iterm2"


def test_resolve_activate_bundle_terminal_app():
    # Terminal.app d'Apple : bundle id com.apple.Terminal.
    assert hook.resolve_activate_bundle("Apple_Terminal") == "com.apple.Terminal"


def test_resolve_activate_bundle_vscode():
    # VS Code intégré : bundle id com.microsoft.VSCode.
    assert hook.resolve_activate_bundle("vscode") == "com.microsoft.VSCode"


def test_resolve_activate_bundle_undefined_term_program():
    # TERM_PROGRAM absent → bascule sur l'app Claude desktop
    # (l'utilisateur n'est pas dans un terminal lancé via le flow normal).
    assert hook.resolve_activate_bundle(None) == "com.anthropic.claudefordesktop"


def test_resolve_activate_bundle_unknown_term_program():
    # Terminal inconnu (ex. WezTerm, ghostty, cursor non-mappé) → Claude app.
    assert (
        hook.resolve_activate_bundle("some-unknown-terminal")
        == "com.anthropic.claudefordesktop"
    )


# ── run() — intégration : couvre chaque plateforme + fallback ─────────────────

def test_uses_terminal_notifier_with_bundle_id_on_darwin():
    # macOS + iTerm2 + terminal-notifier installé → utilise terminal-notifier
    # avec le bon bundle id (le clic ramène iTerm au premier plan).
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
    # macOS + terminal-notifier installé mais TERM_PROGRAM vide → bascule
    # sur le bundle Claude app (le clic ramène Claude desktop).
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
    # macOS + terminal-notifier absent → afplay + osascript fallback
    # (le son Glass.aiff + une notification sans action de clic).
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
    # Linux : essaye paplay (son.freedesktop.org → alsa Front_Center).
    calls = []
    hook.run({}, exec_cmd=lambda c: calls.append(c), platform="linux")
    assert calls


def test_plays_powershell_beep_on_windows():
    # Windows : beep PowerShell (660 Hz, 300 ms).
    calls = []
    hook.run({}, exec_cmd=lambda c: calls.append(c), platform="win32")
    assert any("powershell" in c for c in calls)


def test_returns_none_non_blocking():
    # Le hook retourne toujours None — l'événement Notification n'est pas bloquant.
    assert (
        hook.run(
            {},
            exec_cmd=lambda c: None,
            has_terminal_notifier=lambda: True,
            platform="darwin",
        )
        is None
    )


def test_does_not_raise_when_exec_fails():
    # exec qui lève (son absent, terminal-notifier manquant, etc.) → swallowed.
    def exec_cmd(c):
        raise RuntimeError("commande absente")

    # Doit juste ne pas propager l'erreur (le hook log dans stderr si besoin).
    hook.run(
        {},
        exec_cmd=exec_cmd,
        has_terminal_notifier=lambda: True,
        platform="darwin",
    )


def test_plays_nothing_on_unknown_platform():
    # Plateforme non gérée (freebsd, aix, sunos, …) → aucun appel système.
    calls = []
    hook.run({}, exec_cmd=lambda c: calls.append(c), platform="freebsd")
    assert calls == []
