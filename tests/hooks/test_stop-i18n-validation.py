import importlib.util
import json
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "i18n-validation.py"
_spec = importlib.util.spec_from_file_location("i18n_validation", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_find_ignores_skipped_dirs(tmp_path):
    (tmp_path / "src" / "locales").mkdir(parents=True)
    (tmp_path / "src" / "locales" / "fr.json").write_text('{"a":1}')
    (tmp_path / "src" / "locales" / "en.json").write_text('{"a":1}')
    (tmp_path / "node_modules" / "pkg" / "locales").mkdir(parents=True)
    (tmp_path / "node_modules" / "pkg" / "locales" / "fr.json").write_text('{"a":1}')
    (tmp_path / ".claude" / "worktrees" / "x" / "src" / "locales").mkdir(parents=True)
    (tmp_path / ".claude" / "worktrees" / "x" / "src" / "locales" / "fr.json").write_text('{"a":1}')
    (tmp_path / ".git" / "messages").mkdir(parents=True)
    (tmp_path / ".git" / "messages" / "en.json").write_text('{"a":1}')

    rels = [f["rel"] for f in hook.find_translation_files(str(tmp_path))]
    assert "./src/locales/fr.json" in rels
    assert "./src/locales/en.json" in rels
    assert not any("node_modules" in r for r in rels)
    assert not any(".claude" in r for r in rels)
    assert not any(".git" in r for r in rels)


def test_find_collects_standard_formats(tmp_path):
    (tmp_path / "po").mkdir()
    (tmp_path / "po" / "fr.po").write_text('msgid "x"\nmsgstr ""\n')
    (tmp_path / "app.ftl").write_text("hello = Hello\n")
    (tmp_path / "app_en.arb").write_text('{"a":1}')
    (tmp_path / "en.lproj").mkdir()
    (tmp_path / "en.lproj" / "Localizable.strings").write_text('"k" = "v";\n')

    rels = [f["rel"] for f in hook.find_translation_files(str(tmp_path))]
    assert "./po/fr.po" in rels
    assert "./app.ftl" in rels
    assert "./app_en.arb" in rels
    assert "./en.lproj/Localizable.strings" in rels


def test_find_collects_android_and_ignores_stray_json(tmp_path):
    (tmp_path / "res" / "values").mkdir(parents=True)
    (tmp_path / "res" / "values" / "strings.xml").write_text("<resources/>")
    (tmp_path / "res" / "values-fr").mkdir(parents=True)
    (tmp_path / "res" / "values-fr" / "strings.xml").write_text("<resources/>")
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "data.json").write_text("{}")

    rels = [f["rel"] for f in hook.find_translation_files(str(tmp_path))]
    assert "./res/values/strings.xml" in rels
    assert "./res/values-fr/strings.xml" in rels
    assert not any(r.endswith("data.json") for r in rels)


def test_extract_po_keys():
    po = '''msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgid "Hello"
msgstr "Bonjour"

msgid "Very "
"long id"
msgstr ""

msgid_plural "%d items"
msgstr[0] "%d élément"
msgstr[1] "%d éléments"
'''
    keys = hook.extract_keys(po, "po")
    assert "Hello" in keys
    assert "Very long id" in keys
    assert "%d items" in keys
    assert "Content-Type: text/plain; charset=UTF-8\\n" not in keys
    assert len(keys) == 3


def test_extract_po_keys_with_context():
    po = '''msgctxt "menu"
msgid "Open"
msgstr "Ouvrir"

msgctxt "file"
msgid "Open"
msgstr "Ouvrir"

msgctxt "plural"
msgid "item"
msgid_plural "items"
msgstr[0] "élément"
msgstr[1] "éléments"

msgid "no-context"
msgstr "sans contexte"
'''
    keys = hook.extract_keys(po, "po")
    assert "menu\u0004Open" in keys
    assert "file\u0004Open" in keys
    assert "plural\u0004item" in keys
    assert "plural\u0004items" in keys
    assert "no-context" in keys
    assert "Open" not in keys
    assert len(keys) == 5


def test_extract_ftl_keys():
    ftl = "hello = Hello\n  .attr = x\n-brand = B\nwelcome { $name }"
    assert hook.extract_keys(ftl, "ftl") == {"hello", "welcome"}


def test_extract_apple_android_java_qt_keys():
    assert hook.extract_keys('"k1" = "v1";\n"k2" = "v2";\n', "strings") == {"k1", "k2"}
    android = (
        '<string name="ok">OK</string><string-array name="opts"><item>a</item></string-array>'
        '<plurals name="n"><item quantity="one">x</item></plurals>'
    )
    assert hook.extract_keys(android, "android") == {"ok", "opts", "n"}
    props = "# c\nkey1=val1\nkey2: val2\nkey3=long \\\ncontinued"
    assert hook.extract_keys(props, "properties") == {"key1", "key2", "key3"}
    assert hook.extract_keys("<message><source>Save</source></message>", "qt") == {"Save"}


def test_flattens_nested_json_and_skips_arb_meta():
    assert hook.extract_keys('{"a":{"b":1},"c":[1,2]}', "json") == {"a.b", "c"}
    assert hook.extract_keys('{"title":"x","@title":{"description":"d"}}', "arb") == {"title"}


def test_extract_source_keys():
    src = '''import { useTranslation } from "react-i18next";
const { t } = useTranslation();
const a = t("header.title");
const b = t('menu.open');
const c = i18n.t('common.ok');
const d = gettext("Open the file");
const e = ngettext("%d item", "%d items", n);
const f = pgettext("menu", "Open");
const g = _('legacy.key');
const h = formatMessage({ id: 'profile.name' });
'''
    assert hook.extract_source_keys(src) == {
        "header.title",
        "menu.open",
        "common.ok",
        "Open the file",
        "%d item",
        "%d items",
        "menu\u0004Open",
        "legacy.key",
        "profile.name",
    }


def test_extract_arb_keys_without_meta():
    keys = hook.extract_keys('{"@@locale":"fr","title":"Titre","@@x":1}', "arb")
    assert keys == {"title"}


def test_returns_none_with_less_than_2_files():
    assert hook.run(exec_cmd=lambda c: "./locales/fr.json", project_dir="/p") is None


def test_detects_missing_keys():
    exec_cmd = lambda c: "./locales/fr.json\n./locales/en.json"  # noqa: E731
    read_file = lambda p: '{"a":1,"b":2}' if "fr.json" in p else '{"a":1}'  # noqa: E731
    r = hook.run(exec_cmd=exec_cmd, read_file=read_file, project_dir="/p")
    assert len(r["issues"]) > 0
    assert "manque" in r["message"]


def test_reports_consistency():
    exec_cmd = lambda c: "./locales/fr.json\n./locales/en.json"  # noqa: E731
    read_file = lambda p: '{"a":1}'  # noqa: E731
    r = hook.run(exec_cmd=exec_cmd, read_file=read_file, project_dir="/p")
    assert r["issues"] == []
    assert "cohérents" in r["message"]


def test_returns_none_on_timeout():
    def exec_cmd(c):
        raise RuntimeError("spawnSync /bin/sh ETIMEDOUT")

    assert hook.run(exec_cmd=exec_cmd, project_dir="/p") is None


def test_android_values_compare_ignores_night():
    exec_cmd = lambda c: (  # noqa: E731
        "./res/values/strings.xml\n./res/values-fr/strings.xml\n./res/values-night/strings.xml"
    )

    def read_file(p):
        if "values-fr" in p:
            return '<resources><string name="a">x</string></resources>'
        return '<resources><string name="a">x</string><string name="b">y</string></resources>'

    r = hook.run(exec_cmd=exec_cmd, read_file=read_file, project_dir="/p")
    assert len(r["issues"]) == 1
    assert "values-fr/strings.xml" in r["message"]
    assert "values-night" not in r["message"]


def test_po_same_dir_compare():
    exec_cmd = lambda c: "./po/fr.po\n./po/en.po"  # noqa: E731

    def read_file(p):
        if "fr.po" in p:
            return 'msgid "Hello"\nmsgstr ""\nmsgid "World"\nmsgstr ""\n'
        return 'msgid "Hello"\nmsgstr ""\n'

    r = hook.run(exec_cmd=exec_cmd, read_file=read_file, project_dir="/p")
    assert len(r["issues"]) == 1
    assert "po/en.po" in r["message"]


def test_lproj_and_lc_messages_grouping():
    exec_cmd = lambda c: (  # noqa: E731
        "./en.lproj/Localizable.strings\n./fr.lproj/Localizable.strings\n"
        "./fr/LC_MESSAGES/app.po\n./en/LC_MESSAGES/app.po"
    )

    def read_file(p):
        if "Localizable.strings" in p:
            return '"k1" = "v1";\n"k2" = "v2";\n' if "en.lproj" in p else '"k1" = "v1";\n'
        return 'msgid "a"\nmsgstr ""\nmsgid "b"\nmsgstr ""\n' if "/fr/" in p else 'msgid "a"\nmsgstr ""\n'

    r = hook.run(exec_cmd=exec_cmd, read_file=read_file, project_dir="/p")
    assert len(r["issues"]) == 2
    assert "fr.lproj/Localizable.strings" in r["message"]
    assert "LC_MESSAGES/app.po" in r["message"]


def test_context_avoids_false_positive_between_locales():
    # Sans msgctxt, les deux fichiers auraient la même clé "Open" → 0 issue
    # (oubli masqué). Avec le préfixe de contexte, "file" manque en en.po.
    fr_po = 'msgctxt "menu"\nmsgid "Open"\nmsgstr "Ouvrir"\n\nmsgctxt "file"\nmsgid "Open"\nmsgstr "Ouvrir"\n'
    en_po = 'msgctxt "menu"\nmsgid "Open"\nmsgstr "Open"\n'
    exec_cmd = lambda c: "./po/fr.po\n./po/en.po"  # noqa: E731
    read_file = lambda p: fr_po if "fr.po" in p else en_po  # noqa: E731
    r = hook.run(exec_cmd=exec_cmd, read_file=read_file, project_dir="/p")
    assert len(r["issues"]) == 1
    assert "po/en.po" in r["message"]


def test_locale_subdir_grouping():
    exec_cmd = lambda c: "./locales/fr/common.json\n./locales/en/common.json"  # noqa: E731
    read_file = lambda p: '{"a":1,"b":2}' if "/fr/" in p else '{"a":1}'  # noqa: E731
    r = hook.run(exec_cmd=exec_cmd, read_file=read_file, project_dir="/p")
    assert len(r["issues"]) == 1
    assert "en/common.json" in r["message"]


def test_source_key_missing_reported():
    exec_cmd = lambda c: "./locales/fr.json\n./src/App.tsx"  # noqa: E731

    def read_file(p):
        if "fr.json" in p:
            return '{"a":1}'
        return 't("a")\nt("missing.key")\ngettext("Missing text")'

    r = hook.run(exec_cmd=exec_cmd, read_file=read_file, project_dir="/p")
    assert len(r["issues"]) == 1
    assert "absentes des fichiers de traduction" in r["message"]
    assert "missing.key" in r["message"]
    assert "Missing text" in r["message"]


def test_source_keys_all_present():
    exec_cmd = lambda c: "./locales/fr.json\n./locales/en.json\n./src/App.tsx"  # noqa: E731

    def read_file(p):
        if "App.tsx" in p:
            return 't("a")\nt("b")'
        return '{"a":1,"b":2}'

    r = hook.run(exec_cmd=exec_cmd, read_file=read_file, project_dir="/p")
    assert r["issues"] == []


def test_nested_json_compared_by_full_path():
    exec_cmd = lambda c: "./locales/fr.json\n./locales/en.json"  # noqa: E731
    read_file = lambda p: '{"a":{"b":1}}' if "fr.json" in p else '{"a":{"b":1,"d":2}}'  # noqa: E731
    r = hook.run(exec_cmd=exec_cmd, read_file=read_file, project_dir="/p")
    assert len(r["issues"]) == 1
    assert "fr.json" in r["message"]
    assert "a.d" in r["message"]


def test_native_walk_end_to_end(tmp_path):
    (tmp_path / "locales").mkdir()
    (tmp_path / "locales" / "fr.json").write_text(json.dumps({"a": 1, "b": 2}))
    (tmp_path / "locales" / "en.json").write_text(json.dumps({"a": 1}))
    r = hook.run(project_dir=str(tmp_path))
    assert len(r["issues"]) > 0
    assert "locales/en.json" in r["message"]
