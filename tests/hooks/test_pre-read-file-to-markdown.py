import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "file-to-markdown.py"
_spec = importlib.util.spec_from_file_location("file_to_markdown", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _input(path):
    return {"tool_name": "Read", "tool_input": {"file_path": path}}


def _exec_map(calls):
    def exec_cmd(cmd, **kwargs):
        for key, value in calls.items():
            if key in cmd:
                if isinstance(value, Exception):
                    raise value
                return value
        raise RuntimeError("command not found")

    return exec_cmd


def test_passes_through_non_read_tool():
    assert hook.run({"tool_name": "Write", "tool_input": {"file_path": "doc.pdf"}}) is None


def test_passes_through_unsupported_extension():
    assert hook.run(_input("file.ts")) is None


def test_passes_through_missing_tool_input():
    assert hook.run({"tool_name": "Read"}) is None


def test_passes_through_missing_file():
    assert hook.run(_input("doc.pdf"), exists=lambda p: False) is None


def test_passes_through_when_no_tool_available():
    out = hook.run(_input("doc.pdf"), exec_cmd=lambda cmd, **kwargs: (_ for _ in ()).throw(RuntimeError("not found")), exists=lambda p: True)
    assert out is None


def test_converts_pdf_with_pdftotext():
    exec_cmd = _exec_map(
        {
            "which pdftotext": "/usr/bin/pdftotext",
            "pdftotext": "# Hello World\n\nContenu du PDF.",
        }
    )
    result = hook.run(_input("/tmp/doc.pdf"), exec_cmd=exec_cmd, exists=lambda p: True)
    assert result["decision"] == "block"
    assert "doc.pdf" in result["reason"]
    assert "# Hello World" in result["reason"]


def test_converts_docx_with_pandoc():
    exec_cmd = _exec_map(
        {
            "which pandoc": "/usr/bin/pandoc",
            "pandoc": "# Titre\n\nContenu du document Word.",
        }
    )
    result = hook.run(_input("/tmp/rapport.docx"), exec_cmd=exec_cmd, exists=lambda p: True)
    assert result["decision"] == "block"
    assert "rapport.docx" in result["reason"]
    assert "Contenu du document Word" in result["reason"]


def test_uses_pandoc_as_pdf_fallback():
    exec_cmd = _exec_map({"which pandoc": "/usr/bin/pandoc", "pandoc": "# PDF via pandoc"})
    result = hook.run(_input("/tmp/doc.pdf"), exec_cmd=exec_cmd, exists=lambda p: True)
    assert result["decision"] == "block"
    assert "PDF via pandoc" in result["reason"]


def test_truncates_long_content():
    exec_cmd = _exec_map({"which pandoc": "/usr/bin/pandoc", "pandoc": "a" * 60_000})
    result = hook.run(_input("/tmp/gros.docx"), exec_cmd=exec_cmd, exists=lambda p: True)
    assert "truncated" in result["reason"]
    assert len(result["reason"]) < 55_000


def test_passes_through_conversion_failure():
    exec_cmd = _exec_map(
        {"which pandoc": "/usr/bin/pandoc", "pandoc": RuntimeError("pandoc error")}
    )
    assert hook.run(_input("/tmp/bad.docx"), exec_cmd=exec_cmd, exists=lambda p: True) is None


def test_passes_through_empty_result():
    exec_cmd = _exec_map({"which pandoc": "/usr/bin/pandoc", "pandoc": "   "})
    assert hook.run(_input("/tmp/empty.docx"), exec_cmd=exec_cmd, exists=lambda p: True) is None


def test_supports_epub():
    exec_cmd = _exec_map(
        {"which pandoc": "/usr/bin/pandoc", "pandoc": "# Chapitre 1\n\nContenu."}
    )
    result = hook.run(_input("/tmp/livre.epub"), exec_cmd=exec_cmd, exists=lambda p: True)
    assert result["decision"] == "block"
