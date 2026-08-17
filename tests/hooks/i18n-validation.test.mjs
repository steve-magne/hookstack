// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	extractKeys,
	extractSourceKeys,
	findTranslationFiles,
	run,
} from "../../.claude/hooks/i18n-validation.mjs";

describe("i18n-validation", () => {
	describe("findTranslationFiles (parcours natif)", () => {
		let dir;
		beforeEach(() => {
			dir = mkdtempSync(join(tmpdir(), "i18n-"));
		});
		afterEach(() => {
			dir = undefined;
		});

		it("ignore node_modules, .git et .claude/worktrees (cause du timeout)", () => {
			mkdirSync(join(dir, "src", "locales"), { recursive: true });
			writeFileSync(join(dir, "src", "locales", "fr.json"), '{"a":1}');
			writeFileSync(join(dir, "src", "locales", "en.json"), '{"a":1}');
			mkdirSync(join(dir, "node_modules", "pkg", "locales"), {
				recursive: true,
			});
			writeFileSync(
				join(dir, "node_modules", "pkg", "locales", "fr.json"),
				'{"a":1}',
			);
			mkdirSync(join(dir, ".claude", "worktrees", "x", "src", "locales"), {
				recursive: true,
			});
			writeFileSync(
				join(dir, ".claude", "worktrees", "x", "src", "locales", "fr.json"),
				'{"a":1}',
			);
			mkdirSync(join(dir, ".git", "messages"), { recursive: true });
			writeFileSync(join(dir, ".git", "messages", "en.json"), '{"a":1}');

			const rels = findTranslationFiles(dir).map((f) => f.rel);
			expect(rels).toContain("./src/locales/fr.json");
			expect(rels).toContain("./src/locales/en.json");
			expect(rels).not.toContain("./node_modules/pkg/locales/fr.json");
			expect(rels.some((f) => f.includes(".claude"))).toBe(false);
			expect(rels.some((f) => f.includes(".git"))).toBe(false);
		});

		it("collecte les formats standards où qu'ils soient (po, ftl, arb, strings)", () => {
			mkdirSync(join(dir, "po"), { recursive: true });
			writeFileSync(join(dir, "po", "fr.po"), 'msgid "x"\nmsgstr ""\n');
			writeFileSync(join(dir, "app.ftl"), "hello = Hello\n");
			writeFileSync(join(dir, "app_en.arb"), '{"a":1}');
			mkdirSync(join(dir, "en.lproj"), { recursive: true });
			writeFileSync(join(dir, "en.lproj", "Localizable.strings"), '"k" = "v";\n');

			const rels = findTranslationFiles(dir).map((f) => f.rel);
			expect(rels).toContain("./po/fr.po");
			expect(rels).toContain("./app.ftl");
			expect(rels).toContain("./app_en.arb");
			expect(rels).toContain("./en.lproj/Localizable.strings");
		});

		it("collecte strings.xml Android et ignore un .json hors dossier i18n", () => {
			mkdirSync(join(dir, "res", "values"), { recursive: true });
			writeFileSync(join(dir, "res", "values", "strings.xml"), "<resources/>");
			mkdirSync(join(dir, "res", "values-fr"), { recursive: true });
			writeFileSync(join(dir, "res", "values-fr", "strings.xml"), "<resources/>");
			mkdirSync(join(dir, "src"), { recursive: true });
			writeFileSync(join(dir, "src", "data.json"), "{}");

			const rels = findTranslationFiles(dir).map((f) => f.rel);
			expect(rels).toContain("./res/values/strings.xml");
			expect(rels).toContain("./res/values-fr/strings.xml");
			expect(rels.some((f) => f.endsWith("data.json"))).toBe(false);
		});
	});

	describe("extractKeys", () => {
		it("extrait les msgid gettext (multiligne, pluriel, en-tête ignoré)", () => {
			const po = `msgid ""
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
`;
			const keys = extractKeys(po, "po");
			expect(keys.has("Hello")).toBe(true);
			expect(keys.has("Very long id")).toBe(true);
			expect(keys.has("%d items")).toBe(true);
			expect(keys.has("Content-Type: text/plain; charset=UTF-8\\n")).toBe(false);
			expect(keys.size).toBe(3);
		});

		it("préfixe les clés par msgctxt (gettext)", () => {
			const po = `msgctxt "menu"
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
`;
			const keys = extractKeys(po, "po");
			expect(keys.has("menu\u0004Open")).toBe(true);
			expect(keys.has("file\u0004Open")).toBe(true);
			expect(keys.has("plural\u0004item")).toBe(true);
			expect(keys.has("plural\u0004items")).toBe(true);
			expect(keys.has("no-context")).toBe(true);
			expect(keys.has("Open")).toBe(false);
			expect(keys.size).toBe(5);
		});

		it("extrait les identifiants Fluent (termes et attributs exclus)", () => {
			const ftl = "hello = Hello\n  .attr = x\n-brand = B\nwelcome { $name }";
			expect([...extractKeys(ftl, "ftl")]).toEqual(["hello", "welcome"]);
		});

		it("extrait les clés Apple, Android, Java et Qt", () => {
			expect(
				[...extractKeys('"k1" = "v1";\n"k2" = "v2";\n', "strings")],
			).toEqual(["k1", "k2"]);
			expect(
				[
					...extractKeys(
						'<string name="ok">OK</string><string-array name="opts"><item>a</item></string-array><plurals name="n"><item quantity="one">x</item></plurals>',
						"android",
					),
				],
			).toEqual(["ok", "opts", "n"]);
			expect(
				[...extractKeys("# c\nkey1=val1\nkey2: val2\nkey3=long \\\ncontinued", "properties")],
			).toEqual(["key1", "key2", "key3"]);
			expect(
				[...extractKeys("<message><source>Save</source></message>", "qt")],
			).toEqual(["Save"]);
		});

		it("extrait les clés ARB sans les méta-clés @@", () => {
			const keys = extractKeys('{"@@locale":"fr","title":"Titre","@@x":1}', "arb");
			expect([...keys]).toEqual(["title"]);
		});

		it("aplatit les clés JSON imbriquées et ignore les méta ARB @", () => {
			expect([...extractKeys('{"a":{"b":1},"c":[1,2]}', "json")]).toEqual([
				"a.b",
				"c",
			]);
			expect([...extractKeys('{"title":"x","@title":{"description":"d"}}', "arb")]).toEqual([
				"title",
			]);
		});
	});

	describe("extractSourceKeys", () => {
		it("extrait les clés des appels i18n du code source", () => {
			const src = `import { useTranslation } from "react-i18next";
const { t } = useTranslation();
const a = t("header.title");
const b = t('menu.open');
const c = i18n.t('common.ok');
const d = gettext("Open the file");
const e = ngettext("%d item", "%d items", n);
const f = pgettext("menu", "Open");
const g = _('legacy.key');
const h = formatMessage({ id: 'profile.name' });
`;
			expect(extractSourceKeys(src)).toEqual(
				new Set([
					"header.title",
					"menu.open",
					"common.ok",
					"Open the file",
					"%d item",
					"%d items",
					"menu\u0004Open",
					"legacy.key",
					"profile.name",
				]),
			);
		});
	});

	describe("run()", () => {
		it("retourne null si moins de 2 fichiers i18n", () => {
			expect(
				run({ exec: () => "./locales/fr.json", projectDir: "/p" }),
			).toBeNull();
		});
		it("détecte des clés manquantes (json)", () => {
			const exec = () => "./locales/fr.json\n./locales/en.json";
			const readFile = (p) =>
				p.includes("fr.json") ? '{"a":1,"b":2}' : '{"a":1}';
			const r = run({ exec, readFile, projectDir: "/p" });
			expect(r.issues.length).toBeGreaterThan(0);
			expect(r.message).toContain("manque");
		});
		it("signale la cohérence", () => {
			const exec = () => "./locales/fr.json\n./locales/en.json";
			const readFile = () => '{"a":1}';
			const r = run({ exec, readFile, projectDir: "/p" });
			expect(r.issues).toHaveLength(0);
		});
		it("rend la main silencieusement si le find timeout (ETIMEDOUT)", () => {
			// Un Stop hook non bloquant ne doit pas crasher sur un find qui expire
			// (ex: node_modules de worktrees énormes). On rend null sans bruit.
			const exec = () => {
				throw new Error("spawnSync /bin/sh ETIMEDOUT");
			};
			expect(run({ exec, projectDir: "/p" })).toBeNull();
		});
		it("compare Android values/ vs values-fr/ et ignore values-night", () => {
			const exec = () =>
				"./res/values/strings.xml\n./res/values-fr/strings.xml\n./res/values-night/strings.xml";
			const readFile = (p) =>
				p.includes("values-fr")
					? '<resources><string name="a">x</string></resources>'
					: '<resources><string name="a">x</string><string name="b">y</string></resources>';
			const r = run({ exec, readFile, projectDir: "/p" });
			expect(r.issues).toHaveLength(1);
			expect(r.message).toContain("values-fr/strings.xml");
			expect(r.message).not.toContain("values-night");
		});
		it("compare gettext po/fr.po + po/en.po dans le même dossier", () => {
			const exec = () => "./po/fr.po\n./po/en.po";
			const readFile = (p) =>
				p.includes("fr.po")
					? 'msgid "Hello"\nmsgstr ""\nmsgid "World"\nmsgstr ""\n'
					: 'msgid "Hello"\nmsgstr ""\n';
			const r = run({ exec, readFile, projectDir: "/p" });
			expect(r.issues).toHaveLength(1);
			expect(r.message).toContain("po/en.po");
		});
		it("compare Apple via *.lproj et gettext via LC_MESSAGES", () => {
			const exec = () =>
				"./en.lproj/Localizable.strings\n./fr.lproj/Localizable.strings\n./fr/LC_MESSAGES/app.po\n./en/LC_MESSAGES/app.po";
			const readFile = (p) => {
				if (p.includes("Localizable.strings"))
					return p.includes("en.lproj")
						? '"k1" = "v1";\n"k2" = "v2";\n'
						: '"k1" = "v1";\n';
				return p.includes("/fr/")
					? 'msgid "a"\nmsgstr ""\nmsgid "b"\nmsgstr ""\n'
					: 'msgid "a"\nmsgstr ""\n';
			};
			const r = run({ exec, readFile, projectDir: "/p" });
			expect(r.issues).toHaveLength(2);
			expect(r.message).toContain("fr.lproj/Localizable.strings");
			expect(r.message).toContain("LC_MESSAGES/app.po");
		});
		it("distingue les contextes gettext entre locales (pas de faux positif)", () => {
			// Sans msgctxt, les deux fichiers auraient la même clé "Open" → 0 issue
			// (oubli masqué). Avec le préfixe de contexte, "file" manque en en.po.
			const frPo =
				'msgctxt "menu"\nmsgid "Open"\nmsgstr "Ouvrir"\n\nmsgctxt "file"\nmsgid "Open"\nmsgstr "Ouvrir"\n';
			const enPo = 'msgctxt "menu"\nmsgid "Open"\nmsgstr "Open"\n';
			const exec = () => "./po/fr.po\n./po/en.po";
			const readFile = (p) => (p.includes("fr.po") ? frPo : enPo);
			const r = run({ exec, readFile, projectDir: "/p" });
			expect(r.issues).toHaveLength(1);
			expect(r.message).toContain("po/en.po");
		});

		it("compare les dossiers par-locale (locales/fr/ vs locales/en/)", () => {
			const exec = () => "./locales/fr/common.json\n./locales/en/common.json";
			const readFile = (p) =>
				p.includes("/fr/") ? '{"a":1,"b":2}' : '{"a":1}';
			const r = run({ exec, readFile, projectDir: "/p" });
			expect(r.issues).toHaveLength(1);
			expect(r.message).toContain("en/common.json");
		});
		it("signale les clés du code absentes des traductions", () => {
			const exec = () => "./locales/fr.json\n./src/App.tsx";
			const readFile = (p) =>
				p.includes("fr.json")
					? '{"a":1}'
					: 't("a")\nt("missing.key")\ngettext("Missing text")';
			const r = run({ exec, readFile, projectDir: "/p" });
			expect(r.issues).toHaveLength(1);
			expect(r.message).toContain("absentes des fichiers de traduction");
			expect(r.message).toContain("missing.key, Missing text");
		});

		it("ne signale rien si toutes les clés du code existent", () => {
			const exec = () => "./locales/fr.json\n./locales/en.json\n./src/App.tsx";
			const readFile = (p) => {
				if (p.includes("App.tsx")) return 't("a")\nt("b")';
				return '{"a":1,"b":2}';
			};
			const r = run({ exec, readFile, projectDir: "/p" });
			expect(r.issues).toHaveLength(0);
		});

		it("compare les JSON imbriqués par chemin complet", () => {
			const exec = () => "./locales/fr.json\n./locales/en.json";
			const readFile = (p) =>
				p.includes("fr.json")
					? '{"a":{"b":1}}'
					: '{"a":{"b":1,"d":2}}';
			const r = run({ exec, readFile, projectDir: "/p" });
			expect(r.issues).toHaveLength(1);
			expect(r.message).toContain("fr.json");
			expect(r.message).toContain("a.d");
		});

		it("parcours natif de bout en bout (locales fr/en)", () => {
			const dir = mkdtempSync(join(tmpdir(), "i18n-e2e-"));
			mkdirSync(join(dir, "locales"));
			writeFileSync(join(dir, "locales", "fr.json"), '{"a":1,"b":2}');
			writeFileSync(join(dir, "locales", "en.json"), '{"a":1}');
			const r = run({ projectDir: dir });
			expect(r.issues.length).toBeGreaterThan(0);
			expect(r.message).toContain("locales/en.json");
		});
	});
});
