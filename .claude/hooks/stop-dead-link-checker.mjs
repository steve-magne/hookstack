#!/usr/bin/env node
// @hookstack stop-dead-link-checker
// Vérifie les liens relatifs cassés dans tous les fichiers Markdown du repo (Stop).
// Scan complet — couvre la dette existante, pas seulement les fichiers de la session.
// Purement Node.js (fs + path), sans réseau ni dépendance externe.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKIP_DIRS = new Set([
	"node_modules",
	".git",
	"dist",
	"build",
	".next",
	"out",
	".claude",
]);
// Capture [text](href) — exclut les images ![alt](src) incluses dans la même syntaxe
const LINK_RE = /(?<!!)\[([^\]]*)\]\(([^)]+)\)/g;

function isRelative(href) {
	return (
		!href.startsWith("http") &&
		!href.startsWith("#") &&
		!href.startsWith("mailto:")
	);
}

function stripAnchor(href) {
	return href.split("#")[0].trim();
}

// Ignore les liens d'exemple à l'intérieur des blocs de code (```...```), ce ne sont
// pas de vrais liens à résoudre (ex. templates documentant la syntaxe).
function stripFences(text) {
	let inFence = false;
	return text
		.split("\n")
		.filter((line) => {
			if (/^(```|~~~)/.test(line.trim())) {
				inFence = !inFence;
				return false;
			}
			return !inFence;
		})
		.join("\n");
}

// Liens commençant par "/" : convention OKF v0.1, relatifs à la racine du bundle okf/
// (même résolution que resolveTarget() dans scripts/okf.mjs), pas au système de fichiers.
function resolveAbs(file, target, projectDir) {
	if (target.startsWith("/")) return join(projectDir, "okf", target.slice(1));
	return resolve(dirname(file), target);
}

function walkMd(dir, { readdir = readdirSync, exists = existsSync } = {}) {
	if (!exists(dir)) return [];
	const results = [];
	for (const entry of readdir(dir, { withFileTypes: true })) {
		if (SKIP_DIRS.has(entry.name)) continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) results.push(...walkMd(full, { readdir, exists }));
		else if (/\.mdx?$/.test(entry.name)) results.push(full);
	}
	return results;
}

export function run(
	_input,
	{
		projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
		readFile = readFileSync,
		exists = existsSync,
		readdir = readdirSync,
	} = {},
) {
	const mdFiles = walkMd(projectDir, { readdir, exists });
	if (!mdFiles.length) return null;

	const broken = [];
	for (const file of mdFiles) {
		let content;
		try {
			content = readFile(file, "utf8");
		} catch {
			continue;
		}

		for (const [, , href] of stripFences(content).matchAll(LINK_RE)) {
			if (!isRelative(href)) continue;
			const target = stripAnchor(href);
			if (!target) continue; // lien ancre pure (#section)
			const abs = resolveAbs(file, target, projectDir);
			if (!exists(abs)) {
				broken.push(`${file.replace(`${projectDir}/`, "")}  →  ${href}`);
			}
		}
	}

	if (!broken.length) return null;

	return {
		message:
			`[dead-link-checker] ${broken.length} broken relative link(s) across docs:\n` +
			broken.map((b) => `  - ${b}`).join("\n") +
			"\n",
	};
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	const result = run(input);
	if (result) process.stderr.write(JSON.stringify(result));
}
