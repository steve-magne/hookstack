import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "post-edit-conflict-marker-check.py"
_spec = importlib.util.spec_from_file_location(
    "post_edit_conflict_marker_check", _HOOK
)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _edit(path):
    return {"tool_input": {"file_path": path}}


def _deps(content, exists=True):
    return {
        "read_file": lambda p, enc: content,
        "file_exists": lambda p: exists,
    }


# Marqueurs construits dynamiquement pour ne pas laisser de vrais marqueurs
# de conflit dans ce fichier de test.
OPEN = "<" * 7 + " HEAD"
SEP = "=" * 7
CLOSE = ">" * 7 + " feature-branch"
CONFLICTED = "\n".join(
    ["const a = 1;", OPEN, "const b = 2;", SEP, "const b = 3;", CLOSE]
)


def test_flags_conflict_markers():
    # Les deux bornes (<<<<<<< et >>>>>>>) sont présentes → message d'alerte.
    result = hook.run(_edit("/proj/src/main.py"), **_deps(CONFLICTED))
    assert "conflict marker" in result["message"]


def test_message_includes_file_path():
    result = hook.run(_edit("/proj/src/main.py"), **_deps(CONFLICTED))
    assert "src/main.py" in result["message"]


def test_ignores_file_without_both_markers():
    # Borne ouvrante seule (sans fermante) — laisse passer (faux positif évité).
    assert hook.run(_edit("/proj/src/main.py"), **_deps(OPEN + "\n")) is None


def test_ignores_missing_file():
    assert hook.run(_edit("/proj/src/main.py"), **_deps("", exists=False)) is None


def test_ignores_clean_file():
    # Fichier sain sans marqueur conflictuel.
    assert hook.run(_edit("/proj/src/main.py"), **_deps("const x = 1;\n")) is None


def test_ignores_markdown_underline():
    # Souligné markdown (lignes de ====) : pas un conflit git (pas de marqueurs < ou >).
    assert hook.run(_edit("/proj/README.md"), **_deps("Heading\n" + SEP + "\n")) is None


def test_silent_on_missing_tool_input():
    # tool_input absent → laissez passer sans crash.
    assert hook.run({}, **_deps(CONFLICTED)) is None


def test_silent_when_read_file_raises():
    # Permission refusée, EACCES, etc. — laissez passer (le hook ne signale
    # rien pour ne pas spammer les sorties sur des erreurs transitoires).
    def boom(path, enc):
        raise OSError("EACCES")

    result = hook.run(
        _edit("/proj/src/main.py"), read_file=boom, file_exists=lambda p: True
    )
    assert result is None


def test_ignores_close_marker_without_open_marker():
    # ======= et >>>>>>> seuls (sans <<<<<<<) — laisse passer.
    content = "some code\n" + SEP + "\nsome code\n" + CLOSE + "\n"
    assert hook.run(_edit("/proj/src/main.py"), **_deps(content)) is None
