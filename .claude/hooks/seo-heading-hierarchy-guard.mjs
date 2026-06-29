#!/usr/bin/env node
// @hookstack seo-heading-hierarchy-guard
// Garde la hiérarchie de titres après écriture d'un composant (PostToolUse Write|Edit).
// Cible : src/**/*.tsx. Règle à très faible faux-positif : un seul <h1> par fichier.
// Plusieurs <h1> dans une même vue cassent l'outline SEO/accessibilité (un document =
// un titre principal). La hiérarchie h2→h6 fine, elle, dépend du rendu cross-composant
// → couverte au runtime par le skill seo-geo-aeo, pas en statique.
// Non bloquant : signale le compte de <h1>.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// <h1 …> ou <h1>, mais pas un composant <H1…>.
const H1_RE = /<h1(?=[\s/>])/g;

export function run(input, { readFile = readFileSync } = {}) {
	const filePath = input.tool_input?.file_path ?? "";
	if (!/\/src\/.*\.tsx$/.test(filePath)) return null;

	let content;
	try {
		content = readFile(filePath, "utf8");
	} catch {
		return null;
	}

	const count = (content.match(H1_RE) ?? []).length;
	if (count <= 1) return null;

	return {
		message:
			`[seo-heading] ${filePath} has ${count} <h1> tags.\n` +
			`  → Keep a single <h1> per page (the main title). Demote the others to <h2>/<h3> ` +
			`to preserve the document outline.\n`,
	};
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	const result = run(input);
	if (result?.message) process.stderr.write(result.message);
}
