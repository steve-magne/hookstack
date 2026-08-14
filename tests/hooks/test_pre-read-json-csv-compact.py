import importlib.util
import json
from pathlib import Path

_HOOK = (
    Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "pre-read-json-csv-compact.py"
)
_spec = importlib.util.spec_from_file_location("pre_read_json_csv_compact", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def big_json(n):
    return json.dumps([{"id": i, "name": f"user_{i}", "email": f"u{i}@x.com"} for i in range(n)])


def big_csv(n):
    rows = ["id,name,email"] + [f"{i},user_{i},u{i}@x.com" for i in range(n)]
    return "\n".join(rows)


def big_jsonl(n):
    return "\n".join(json.dumps({"id": i, "val": i * 2}) for i in range(n))


def _deps(content, size=100_000):
    return {
        "read_file": lambda path: content,
        "exists": lambda path: True,
        "stat_size": lambda path: size,
    }


def _input(path):
    return {"tool_name": "Read", "tool_input": {"file_path": path}}


def test_passes_through_non_read_tool():
    assert hook.run({"tool_name": "Write", "tool_input": {"file_path": "data.json"}}) is None


def test_passes_through_unsupported_extension():
    assert hook.run(_input("file.ts")) is None


def test_passes_through_missing_file():
    deps = {
        "read_file": lambda p: None,
        "exists": lambda p: False,
        "stat_size": lambda p: 100_000,
    }
    assert hook.run(_input("big.json"), **deps) is None


def test_passes_through_small_file():
    content = json.dumps([{"id": 1}])
    assert hook.run(_input("small.json"), **_deps(content, size=100)) is None


def test_summarizes_big_json_array():
    result = hook.run(_input("/tmp/users.json"), **_deps(big_json(300)))
    assert result["decision"] == "block"
    assert "users.json" in result["reason"]
    assert "300 items" in result["reason"]
    assert "id" in result["reason"]


def test_summarizes_big_json_object():
    obj = {f"key{i}": i for i in range(300)}
    content = json.dumps(obj, indent=2)
    result = hook.run(_input("/tmp/config.json"), **_deps(content))
    assert result["decision"] == "block"
    assert "config.json" in result["reason"]


def test_summarizes_big_csv():
    result = hook.run(_input("/tmp/data.csv"), **_deps(big_csv(300)))
    assert result["decision"] == "block"
    assert "data.csv" in result["reason"]
    assert "300 rows" in result["reason"]
    assert "id,name,email" in result["reason"]


def test_summarizes_big_jsonl():
    result = hook.run(_input("/tmp/events.jsonl"), **_deps(big_jsonl(300)))
    assert result["decision"] == "block"
    assert "events.jsonl" in result["reason"]
    assert "300 lines" in result["reason"]


def test_passes_through_invalid_json():
    content = "not json\n" * 300
    assert hook.run(_input("/tmp/bad.json"), **_deps(content)) is None
