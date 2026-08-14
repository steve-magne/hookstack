import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "pre-read-block-binary.py"
_spec = importlib.util.spec_from_file_location("pre_read_block_binary", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _read(path):
    return {"tool_name": "Read", "tool_input": {"file_path": path}}


def test_blocks_pyc():
    result = hook.run(_read("/proj/__pycache__/mod.cpython-39.pyc"))
    assert result["decision"] == "block"
    assert ".pyc" in result["reason"]


def test_blocks_exe():
    # Exécutable Windows — claude ne peut pas l'exploiter.
    result = hook.run(_read("/proj/build/app.exe"))
    assert result["decision"] == "block"
    assert ".exe" in result["reason"]


def test_blocks_jar():
    # Archive Java — binaire.
    assert hook.run(_read("/proj/lib/spring.jar"))["decision"] == "block"


def test_blocks_pickle():
    # Pickle — modèle sérialisé (binaire + risque d'exécution arbitraire).
    assert hook.run(_read("/proj/cache/model.pkl"))["decision"] == "block"


def test_blocks_sqlite_db():
    # Base SQLite — binaire, à inspecter via Bash.
    assert hook.run(_read("/proj/data/dev.sqlite3"))["decision"] == "block"


def test_blocks_wasm_module():
    # WebAssembly — binaire.
    assert hook.run(_read("/proj/lib/module.wasm"))["decision"] == "block"


def test_blocks_onnx_model():
    assert hook.run(_read("/proj/models/model.onnx"))["decision"] == "block"


def test_blocks_zip_archive():
    assert hook.run(_read("/proj/data.zip"))["decision"] == "block"


def test_extension_case_insensitive():
    # .ZIP en majuscules doit être traité comme .zip — l'extraction utilise .lower().
    assert hook.run(_read("/proj/archive.ZIP"))["decision"] == "block"


def test_reason_mentions_bash_alternative():
    # La reason doit orienter vers Bash (l'utilisateur doit pouvoir inspecter via `file`/`ls`).
    result = hook.run(_read("/proj/build/app.exe"))
    assert "Bash" in result["reason"]


def test_allows_text_file():
    assert hook.run(_read("/proj/src/main.py")) is None


def test_allows_json_file():
    # .json est sérialisé en texte — lisible.
    assert hook.run(_read("/proj/data.json")) is None


def test_allows_unknown_extension():
    assert hook.run(_read("/proj/file.weird")) is None


def test_silent_on_non_read_tool():
    # L'événement PreToolUse Read matche cet outil uniquement — sur Bash/Write, le hook reste silencieux.
    assert hook.run({"tool_name": "Bash", "tool_input": {}}) is None


def test_silent_when_tool_input_absent():
    # Pas de tool_input (read sans path connu) → laissez passer silencieusement.
    assert hook.run({"tool_name": "Read"}) is None
