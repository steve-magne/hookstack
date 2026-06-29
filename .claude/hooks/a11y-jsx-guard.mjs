#!/usr/bin/env node
// @hookstack a11y-jsx-guard
import { execSync } from "node:child_process";
// @hookstack a11y-jsx-guard
// Garde d'accessibilité JSX sur les composants src/**/*.tsx|jsx (PostToolUse Write|Edit).
// Progressive enhancement :
//   • Biome installé → règles a11y natives (lint/a11y/*, aucun plugin requis)
//   • Biome absent   → vérifications statiques (4 règles regex, zéro dépendance)
// Non bloquant : cumule les violations dans un message.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// ── Chemin Biome ───────────────────────────────────────────────────────────────

function defaultExec(cmd) {
	return execSync(cmd, { stdio: "pipe", timeout: 20_000, encoding: "utf8" });
}

function runBiome(filePath, { exec }) {
	try {
		exec(
			`npx --no-install biome lint --only=a11y --reporter=rdjson "${filePath}"`,
		);
		return null;
	} catch (err) {
		const raw = err.stdout?.toString() ?? "";
		let parsed;
		try {
			parsed = JSON.parse(raw);
		} catch {
			return null;
		}

		const msgs = (parsed.diagnostics ?? []).filter((d) =>
			d.code?.value?.startsWith("lint/a11y/"),
		);
		if (!msgs.length) return null;

		return {
			message:
				`[a11y] ${filePath.split("/").pop()} accessibility violations:\n` +
				msgs
					.map(
						(m) =>
							`  ✗ ${m.code.value}: ${m.message} (line ${m.location?.range?.start?.line ?? "?"})`,
					)
					.join("\n") +
				"\n",
		};
	}
}

// ── Chemin statique (fallback zéro-dépendance) ────────────────────────────────
//
// Extrait chaque balise ouvrante d'un type donné, du `<tag` jusqu'au `>` de fermeture
// au niveau 0. On suit la profondeur des accolades et on saute les chaînes : ainsi un
// `>` issu d'une fonction fléchée `() =>` dans une prop, ou d'un `>` dans une string,
// ne tronque pas la balise (sinon role=/onKeyDown placés après seraient ignorés).
function openingTags(content, tag) {
	const tags = [];
	const re = new RegExp(`<${tag}\\b`, "g");
	let m = re.exec(content);
	while (m) {
		let depth = 0;
		let quote = null;
		for (let j = m.index; j < content.length; j++) {
			const ch = content[j];
			if (quote) {
				if (ch === quote) quote = null;
			} else if (ch === '"' || ch === "'" || ch === "`") {
				quote = ch;
			} else if (ch === "{") {
				depth++;
			} else if (ch === "}") {
				depth--;
			} else if (ch === ">" && depth === 0) {
				tags.push(content.slice(m.index, j + 1));
				break;
			}
		}
		m = re.exec(content);
	}
	return tags;
}

const STATIC_CHECKS = [
	(c) =>
		openingTags(c, "Image").some((t) => !/\balt\s*=/.test(t))
			? '<Image> without an `alt` prop → describe the image (alt="" only if purely decorative)'
			: null,
	(c) =>
		/\btabIndex=\{?\s*['"]?[1-9]\d*/.test(c)
			? "positive tabIndex → breaks natural tab order; use tabIndex={0} or restructure the DOM"
			: null,
	(c) =>
		openingTags(c, "a").some(
			(t) =>
				/target=['"]_blank['"]/.test(t) && !/\brel=['"][^'"]*noopener/.test(t),
		)
			? 'target="_blank" without rel="noopener noreferrer" → security + SEO best practice'
			: null,
	(c) =>
		["div", "span", "li"].some((tag) =>
			openingTags(c, tag).some(
				(t) =>
					/\bonClick=/.test(t) &&
					!/\brole=/.test(t) &&
					!/\bonKey(?:Down|Press|Up)=/.test(t),
			),
		)
			? "onClick on a non-interactive element (div/span/li) without role + keyboard handler → use <button>, or add role and onKeyDown"
			: null,
];

function runStatic(filePath, { readFile }) {
	let content;
	try {
		content = readFile(filePath, "utf8");
	} catch {
		return null;
	}
	const violations = STATIC_CHECKS.map((check) => check(content)).filter(
		Boolean,
	);
	if (!violations.length) return null;
	return {
		message:
			`[a11y] ${filePath} has accessibility issues:\n` +
			violations.map((v) => `  - ${v}`).join("\n") +
			"\n",
	};
}

// ── Point d'entrée ─────────────────────────────────────────────────────────────

export function run(
	input,
	{
		exec = defaultExec,
		exists = existsSync,
		readFile = readFileSync,
		projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
	} = {},
) {
	const filePath = input.tool_input?.file_path ?? "";
	if (!/\/src\/.*\.[jt]sx$/.test(filePath)) return null;

	if (exists(join(projectDir, "node_modules/@biomejs/biome"))) {
		return runBiome(filePath, { exec });
	}

	return runStatic(filePath, { readFile });
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	const result = run(input);
	if (result?.message) process.stderr.write(result.message);
}
