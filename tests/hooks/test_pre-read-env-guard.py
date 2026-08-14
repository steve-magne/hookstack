import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "pre-read-env-guard.py"
_spec = importlib.util.spec_from_file_location("pre_read_env_guard", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _read(path):
    return {"tool_name": "Read", "tool_input": {"file_path": path}}


def test_blocks_env():
    result = hook.run(_read("/proj/.env"))
    assert result["decision"] == "block"


def test_blocks_env_local():
    assert hook.run(_read("/proj/.env.local"))["decision"] == "block"


def test_blocks_env_production():
    # .env.production (variable d'env spécifique à un déploiement) — bloqué.
    assert hook.run(_read("/proj/apps/web/.env.production"))["decision"] == "block"


def test_allows_env_example():
    assert hook.run(_read("/proj/.env.example")) is None


def test_allows_env_dist():
    assert hook.run(_read("/proj/.env.dist")) is None


def test_allows_env_sample_and_template():
    # .sample/.template sont des suffixes sûrs (référencés en exemple).
    assert hook.run(_read("/proj/.env.sample")) is None
    assert hook.run(_read("/proj/.env.template")) is None


def test_allows_env_local_example_with_safe_suffix():
    # .env.local.example : le suffixe sûr .example gagne (la regex vérifie d'abord
    # le suffixe, sinon ça matcherait .env.local).
    assert hook.run(_read("/proj/.env.local.example")) is None


def test_allows_non_env_file():
    assert hook.run(_read("/proj/src/main.py")) is None


def test_allows_file_containing_env_word_but_not_dotenv():
    # `environment.ts` ne commence PAS par .env → laisse passer
    # (la regex exige que le basename matche `^.env(.+)?$`).
    assert hook.run(_read("/proj/config/environment.ts")) is None


def test_silent_on_non_read_tool():
    assert hook.run({"tool_name": "Bash", "tool_input": {}}) is None


def test_silent_when_tool_input_absent():
    # Pas de tool_input → laissez passer silencieusement.
    assert hook.run({"tool_name": "Read"}) is None


def test_reason_mentions_env_example():
    # La reason doit orienter vers `.env.example` (les vrais secrets ne sont pas
    # nécessaires pour explorer les noms de variables).
    result = hook.run(_read("/proj/.env"))
    assert ".env.example" in result["reason"]
