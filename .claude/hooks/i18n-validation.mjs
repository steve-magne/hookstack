#!/usr/bin/env node
// @hookstack stop-i18n-validation
// Valide la cohérence des fichiers de traduction (Stop)
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Répertoires exclus du parcours : lourds et sans traduction.
// `.claude` contient les worktrees (copies complètes du repo) — principal coupable du timeout.
const SKIP_DIRS = new Set([
	"node_modules",
	".git",
	".claude",
	".next",
	".turbo",
	".sveltekit",
	"dist",
	"build",
	".cache",
	"coverage",
	".worktrees",
]);

// Segment de chemin qui marque un dossier de traduction. Couvre les conventions
// web (locales/messages/i18n/translations/lang/l10n), GNU gettext (po,
// LC_MESSAGES) et Apple (*.lproj). Android `values*` et Qt `translations/*.ts`
// sont traités par nom de fichier (voir classifyFile).
const I18N_DIR_PATH =
	/(?:^|[/\\])(?:locales?|messages?|translations?|langs?|l10n|i18n|po|LC_MESSAGES|[^/\\]*\.lproj)[/\\]/i;

// Dossier Android comparable : `values` ou `values-<locale>` (BCP-47 simplifié).
// Les qualifiers non-locale (values-night, values-land, values-sw600dp,
// values-v21…) sont exclus — un override partiel de thème n'est pas une
// traduction manquante.
const ANDROID_VALUES_RE = /^values(?:-[a-z]{2,3}(?:-[A-Za-z]{2,8})*)?$/i;

// Dernier segment de chemin qui ressemble à une locale (fr, en-US, pt_BR…).
const LOCALE_SEG = /^[a-z]{2,3}(?:[-_][a-z0-9]{2,8})*$/i;

// Noms de dossiers de traduction connus — ne jamais les traiter comme une locale
// (ex. `po` matcherait LOCALE_SEG et casserait le groupement de po/fr.po).
const I18N_SEG =
	/^(?:locales?|messages?|translations?|langs?|l10n|i18n|po|LC_MESSAGES|[^/\\]*\.lproj)$/i;

// Noms de fichiers de traduction sans ambiguïté (Android, bundles Java).
const I18N_FILE = /^(?:strings\.xml|messages.*\.properties)$/i;

/**
 * Classe un chemin relatif (sans "./" initial) en fichier de traduction.
 * Retourne { rel, kind, group } ou null. `kind` pilote l'extraction des clés ;
 * `group` décide quels fichiers sont comparés entre eux.
 */
export function classifyFile(rel) {
	const clean = rel.replace(/^\.\//, "");
	const slash = clean.lastIndexOf("/");
	const dir = slash === -1 ? "" : clean.slice(0, slash);
	const base = slash === -1 ? clean : clean.slice(slash + 1);
	const dot = base.lastIndexOf(".");
	const ext = dot === -1 ? "" : base.slice(dot + 1).toLowerCase();

	let kind = null;
	if (ext === "json") {
		if (I18N_DIR_PATH.test(`/${dir}/`)) kind = "json";
	} else if (ext === "arb") {
		kind = "arb"; // Flutter : l'extension n'est utilisée que pour les ARB
	} else if (ext === "po" || ext === "pot") {
		kind = "po"; // GNU gettext
	} else if (ext === "ftl") {
		kind = "ftl"; // Project Fluent
	} else if (ext === "strings") {
		kind = "strings"; // Apple
	} else if (ext === "xml" && base === "strings.xml") {
		const last = dir.split("/").filter((s) => s && s !== ".").pop() ?? "";
		if (ANDROID_VALUES_RE.test(last)) kind = "android";
	} else if (ext === "properties") {
		// Bundles Java : sous un dossier i18n ou nommés messages*/MessagesBundle*
		if (I18N_DIR_PATH.test(`/${dir}/`) || I18N_FILE.test(base)) kind = "properties";
	} else if (ext === "ts" && I18N_DIR_PATH.test(`/${dir}/`)) {
		kind = "qt"; // Qt Linguist — jamais hors dossier i18n (collision avec .ts)
	}
	if (!kind) return null;

	return { rel, kind, group: groupOf(dir, base, kind) };
}

function groupOf(dir, base, kind) {
	const segs = dir.split("/").filter((s) => s && s !== ".");
	const last = segs[segs.length - 1] ?? "";
	if (kind === "android") {
		// res/values/strings.xml + res/values-fr/strings.xml → même groupe,
		// modules Android distincts → groupes distincts.
		const agnostic = dir.replace(/\/values(?:-[^/]*)?$/i, "");
		return `base:${agnostic}/${base}`;
	}
	if (/\.lproj$/i.test(last) || /^LC_MESSAGES$/i.test(last)) {
		// La locale est dans le dossier : *.lproj (Apple), <locale>/LC_MESSAGES (gettext)
		let idx = segs.length - 1;
		if (/^LC_MESSAGES$/i.test(segs[idx]) && idx > 0 && LOCALE_SEG.test(segs[idx - 1]))
			idx -= 1;
		return `base:${segs.slice(0, idx).join("/")}/${base}`;
	}
	if (LOCALE_SEG.test(last) && !I18N_SEG.test(last)) {
		// Dossiers par-locale : locales/fr/common.json vs locales/en/common.json
		return `dirbase:${segs.slice(0, -1).join("/")}/${base}`;
	}
	return `dir:${dir}`;
}

// ── Extraction des clés par format ──────────────────────────────────────────

function poKeys(content) {
	// GNU gettext : msgid (éventuellement msgid_plural), multiligne via "...".
	// L'en-tête du fichier (premier bloc déclaré `msgid ""`) est ignoré, même si
	// ses lignes de continuation l'alimentent (Content-Type, Plural-Forms…).
	// Un `msgctxt` préfixe la clé (contexte + EOT \x04, comme gettext) : deux
	// msgid identiques sous des contextes différents deviennent des clés distinctes
	// — pas de faux positif ni d'oubli masqué entre locales.
	const keys = new Set();
	let current = null; // msgid en cours (null = hors bloc)
	let plural = null; // msgid_plural du bloc (conserve le même contexte)
	let prefix = ""; // contexte capturé au début du bloc + "\u0004"
	let mode = null; // "context" | "msgid" | "plural" — lignes de continuation
	let first = true;
	let skipBlock = false; // seul le premier bloc `msgid ""` (en-tête) est ignoré
	const addId = (id) => {
		if (id !== null && id !== "" && !skipBlock) keys.add(`${prefix}${id}`);
	};
	const flush = () => {
		addId(current);
		addId(plural);
		current = null;
		plural = null;
		prefix = "";
		mode = null;
		skipBlock = false;
	};
	for (const raw of content.split("\n")) {
		const line = raw.trim();
		if (line.startsWith("msgctxt")) {
			flush(); // clôt tout bloc précédent (le msgctxt ouvre un nouveau contexte)
			const m = /^msgctxt\s*("(?:[^"\\]|\\.)*")?/.exec(line);
			const ctx = m?.[1] ? m[1].slice(1, -1) : "";
			prefix = ctx ? `${ctx}\u0004` : "";
			mode = "context";
			continue;
		}
		if (mode === "context" && line.startsWith('"')) {
			const m = /^"((?:[^"\\]|\\.)*)"/.exec(line);
			if (m) prefix = `${prefix ? prefix.slice(0, -1) : ""}${m[1]}\u0004`;
			continue;
		}
		if (/^msgid_plural/.test(line)) {
			// Même bloc que msgid : on ajoute le msgid capturé, le pluriel
			// garde le même préfixe de contexte.
			const m = /^msgid_plural\s*("(?:[^"\\]|\\.)*")?/.exec(line);
			addId(current);
			current = null;
			plural = m?.[1] ? m[1].slice(1, -1) : "";
			mode = "plural";
			continue;
		}
		if (/^msgid/.test(line)) {
			// Ne flushe que si un bloc est réellement ouvert : un msgctxt qui vient
			// d'être lu a déjà clos le précédent et ne doit pas effacer le préfixe.
			if (current !== null || plural !== null) flush();
			const m = /^msgid\s*("(?:[^"\\]|\\.)*")?/.exec(line);
			current = m?.[1] ? m[1].slice(1, -1) : "";
			mode = "msgid";
			if (first) {
				skipBlock = current === "";
				first = false;
			}
			continue;
		}
		if (mode !== null && line.startsWith('"')) {
			const m = /^"((?:[^"\\]|\\.)*)"/.exec(line);
			if (!m) continue;
			if (mode === "msgid") current += m[1];
			else if (mode === "plural") plural += m[1];
			continue;
		}
		if (/^msgstr/.test(line)) flush();
	}
	flush();
	return keys;
}

function ftlKeys(content) {
	// Project Fluent : identifiants de premier niveau `name = …` / `name { … }`.
	// Les attributs (`.attr`, indentés) et termes (`-name`) sont exclus.
	const keys = new Set();
	for (const line of content.split("\n")) {
		const m = /^([a-zA-Z][\w-]*)\s*(?:=|{)/.exec(line);
		if (m) keys.add(m[1]);
	}
	return keys;
}

function stringsKeys(content) {
	// Apple .strings : "clé" = "valeur";
	const keys = new Set();
	const re = /^\s*"((?:[^"\\]|\\.)*)"\s*=\s*"/gm;
	for (const m of content.matchAll(re)) keys.add(m[1]);
	return keys;
}

function xmlStringKeys(content) {
	// Android strings.xml : <string|string-array|plurals name="…">.
	const keys = new Set();
	const re = /<(?:string|string-array|plurals)\b[^>]*\bname="([^"]+)"/g;
	for (const m of content.matchAll(re)) keys.add(m[1]);
	return keys;
}

function propertiesKeys(content) {
	// Bundles Java .properties : key=value / key: value / key value,
	// continuations `\`, commentaires # et !.
	const keys = new Set();
	const flush = (logical) => {
		const sep = logical.search(/[=:]/);
		if (sep === -1) {
			const ws = logical.search(/\s/);
			keys.add((ws === -1 ? logical : logical.slice(0, ws)).trim());
		} else {
			keys.add(logical.slice(0, sep).trim());
		}
	};
	let pending = null;
	for (const raw of content.split("\n")) {
		const line = raw.replace(/\r$/, "");
		if (pending !== null) {
			pending += line;
			if (line.endsWith("\\")) {
				pending = pending.slice(0, -1);
				continue;
			}
			flush(pending);
			pending = null;
			continue;
		}
		const t = line.trim();
		if (!t || t.startsWith("#") || t.startsWith("!")) continue;
		if (line.endsWith("\\")) {
			pending = line.slice(0, -1);
			continue;
		}
		flush(line);
	}
	if (pending !== null) flush(pending);
	return keys;
}

function tsKeys(content) {
	// Qt Linguist .ts (XML) : les <source> sont les clés de traduction.
	const keys = new Set();
	const re = /<source>([^<]*)<\/source>/g;
	for (const m of content.matchAll(re)) {
		const k = m[1].trim();
		if (k) keys.add(k);
	}
	return keys;
}

// Aplatit un objet JSON en clés pointées : i18next/next-intl référencent
// `header.title` dans le code, pas l'objet imbriqué. Les tableaux restent
// des feuilles. `skipMeta` retire les méta-clés ARB (`@description`…).
function flattenKeys(obj, prefix, out, skipMeta) {
	for (const [k, v] of Object.entries(obj)) {
		if (skipMeta && k.startsWith("@")) continue;
		const path = prefix ? `${prefix}.${k}` : k;
		if (v !== null && typeof v === "object" && !Array.isArray(v)) {
			flattenKeys(v, path, out, skipMeta);
		} else {
			out.add(path);
		}
	}
	return out;
}

/** Extrait les clés de traduction d'un contenu selon le format détecté. */
export function extractKeys(content, kind) {
	switch (kind) {
		case "json":
			return flattenKeys(JSON.parse(content), "", new Set());
		case "arb":
			return flattenKeys(JSON.parse(content), "", new Set(), true);
		case "po":
			return poKeys(content);
		case "ftl":
			return ftlKeys(content);
		case "strings":
			return stringsKeys(content);
		case "android":
			return xmlStringKeys(content);
		case "properties":
			return propertiesKeys(content);
		case "qt":
			return tsKeys(content);
		default:
			return new Set();
	}
}

// ── Clés appelées dans le code source ───────────────────────────────────────

// Extensions de fichiers source parcourus (JS/TS, Vue, Svelte, Python, PHP).
const SOURCE_EXT = /\.(?:tsx?|jsx?|mjs|cjs|vue|svelte|py|php)$/i;
// Fichiers de test exclus : ils référencent volontairement des clés inexistantes.
const SOURCE_SKIP_NAME = /\.(?:test|spec)\.[a-z]+$/i;
const SOURCE_SKIP_DIR = new Set(["tests", "__tests__", "test"]);

// Appels i18n reconnus dans le code. Un argument littéral (chaîne simple) est
// la clé ; `pgettext('ctx', 'msg')` référence le msgctxt gettext (contexte + EOT).
const SRC_T = /\bt\(\s*['"]([^'"\n]+)['"]/g;
const SRC_I18N_T = /\bi18n\.t\(\s*['"]([^'"\n]+)['"]/g;
const SRC_GETTEXT = /\bgettext\(\s*['"]([^'"\n]+)['"]/g;
const SRC_NGETTEXT = /\bngettext\(\s*['"]([^'"\n]+)['"]\s*,\s*['"]([^'"\n]+)['"]/g;
const SRC_PGETTEXT = /\bpgettext\(\s*['"]([^'"\n]+)['"]\s*,\s*['"]([^'"\n]+)['"]/g;
const SRC_UNDERSCORE = /\b(?:_|__|N_)\(\s*['"]([^'"\n]+)['"]/g;
const SRC_FORMAT_MESSAGE = /\bformatMessage\(\s*\{\s*id\s*:\s*['"]([^'"\n]+)['"]/g;

/** Extrait les clés i18n référencées dans un fichier source. */
export function extractSourceKeys(content) {
	const keys = new Set();
	for (const m of content.matchAll(SRC_T)) keys.add(m[1]);
	for (const m of content.matchAll(SRC_I18N_T)) keys.add(m[1]);
	for (const m of content.matchAll(SRC_GETTEXT)) keys.add(m[1]);
	for (const m of content.matchAll(SRC_NGETTEXT)) {
		keys.add(m[1]);
		keys.add(m[2]);
	}
	for (const m of content.matchAll(SRC_PGETTEXT)) keys.add(`${m[1]}\u0004${m[2]}`);
	for (const m of content.matchAll(SRC_UNDERSCORE)) keys.add(m[1]);
	for (const m of content.matchAll(SRC_FORMAT_MESSAGE)) keys.add(m[1]);
	return keys;
}

/** True quand un chemin relatif pointe un fichier source analysable. */
export function isSourceFile(rel) {
	const clean = rel.replace(/^\.\//, "");
	const slash = clean.lastIndexOf("/");
	const base = slash === -1 ? clean : clean.slice(slash + 1);
	if (!SOURCE_EXT.test(base) || SOURCE_SKIP_NAME.test(base)) return false;
	const dirs = clean.split("/").slice(0, -1);
	return !dirs.some((d) => SOURCE_SKIP_DIR.has(d));
}

// Parcours natif des fichiers source (tests exclus, dossiers lourds sautés).
export function findSourceFiles(projectDir) {
	const out = [];
	const walk = (dir) => {
		let ents;
		try {
			ents = readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const ent of ents) {
			if (ent.isDirectory()) {
				if (SKIP_DIRS.has(ent.name) || SOURCE_SKIP_DIR.has(ent.name)) continue;
				walk(join(dir, ent.name));
			} else if (ent.isFile() && isSourceFile(ent.name)) {
				const rel = relative(projectDir, join(dir, ent.name))
					.split(sep)
					.join("/");
				out.push(`./${rel}`);
			}
		}
	};
	walk(projectDir);
	return out;
}

// Parcours natif (pas de spawn de shell) : rapide même sur un gros monorepo.
export function findTranslationFiles(projectDir) {
	const out = [];
	const walk = (dir) => {
		let ents;
		try {
			ents = readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const ent of ents) {
			if (ent.isDirectory()) {
				if (SKIP_DIRS.has(ent.name)) continue;
				walk(join(dir, ent.name));
			} else if (ent.isFile()) {
				const rel = relative(projectDir, join(dir, ent.name))
					.split(sep)
					.join("/");
				const classified = classifyFile(rel);
				if (classified) out.push({ ...classified, rel: `./${rel}` });
			}
		}
	};
	walk(projectDir);
	return out;
}

export function run({
	exec,
	readFile = readFileSync,
	projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
} = {}) {
	// `exec` n'est utilisé que par les tests (mock) ; en production, parcours natif
	// (plus de spawn shell, donc plus de risque d'ETIMEDOUT sur un gros monorepo).
	// Ponytail: try/catch conservé — un mock qui throw ne doit pas crasher un Stop
	// hook non bloquant ; on rend la main silencieusement.
	let files;
	let sources;
	try {
		if (exec) {
			const lines = exec('find . -print')
				.split("\n")
				.map((f) => f.trim())
				.filter(Boolean);
			files = lines.map(classifyFile).filter(Boolean);
			sources = lines.filter(isSourceFile);
		} else {
			files = findTranslationFiles(projectDir);
			sources = findSourceFiles(projectDir);
		}
	} catch {
		return null;
	}

	if (files.length === 0) return null;
	if (files.length < 2 && sources.length === 0) return null;

	// Groupe par clé locale-agnostique et vérifie la cohérence des clés
	const byGroup = new Map();
	for (const f of files) {
		if (!byGroup.has(f.group)) byGroup.set(f.group, []);
		byGroup.get(f.group).push(f);
	}

	const issues = [];
	for (const group of byGroup.values()) {
		if (group.length < 2) continue;
		const parsed = group
			.map((f) => {
				try {
					return {
						rel: f.rel,
						keys: extractKeys(readFile(join(projectDir, f.rel), "utf8"), f.kind),
					};
				} catch {
					return null;
				}
			})
			.filter(Boolean);

		const allKeys = new Set(parsed.flatMap((p) => [...p.keys]));
		for (const { rel, keys } of parsed) {
			const missing = [...allKeys].filter((k) => !keys.has(k));
			if (missing.length > 0)
				issues.push(
					`${rel} manque ${missing.length} clé(s) : ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}`,
				);
		}
	}

	// Clés utilisées dans le code : elles doivent exister dans les traductions
	// (union de toutes les locales, tous formats). pgettext préfixe msgctxt+EOT.
	if (sources.length > 0) {
		const translationKeys = new Set();
		for (const f of files) {
			try {
				for (const k of extractKeys(
					readFile(join(projectDir, f.rel), "utf8"),
					f.kind,
				))
					translationKeys.add(k);
			} catch {
				// fichier illisible — ignoré
			}
		}
		if (translationKeys.size > 0) {
			const missing = new Set();
			for (const rel of sources) {
				try {
					for (const k of extractSourceKeys(
						readFile(join(projectDir, rel), "utf8"),
					)) {
						if (!translationKeys.has(k)) missing.add(k);
					}
				} catch {
					// fichier illisible — ignoré
				}
			}
			if (missing.size > 0) {
				const shown = [...missing].slice(0, 10).join(", ");
				issues.push(
					`Clé(s) du code absentes des fichiers de traduction (${missing.size}) : ${shown}${missing.size > 10 ? `… (+${missing.size - 10})` : ""}`,
				);
			}
		}
	}

	const message =
		issues.length > 0
			? `[i18n-validation] Incohérences détectées :\n${issues.map((i) => `  - ${i}`).join("\n")}\n`
			: "[i18n-validation] ✓ Fichiers de traduction cohérents.\n";

	return { issues, message };
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const result = run();
	if (result) process.stderr.write(result.message);
}
