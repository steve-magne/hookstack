#!/usr/bin/env node
// @hookstack pre-bash-enforce-package-managers
// Bloque npm et yarn, impose pnpm pour ce projet Node.js (PreToolUse Bash)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const FORBIDDEN = [
	{ pattern: /(^|[;&|\s])npm(\s|$)/, replacement: "pnpm" },
	{ pattern: /(^|[;&|\s])yarn(\s|$)/, replacement: "pnpm" },
];

export function run(input) {
	if (input.tool_name !== "Bash") return null;
	const cmd = input.tool_input?.command ?? "";
	// Supprime le contenu des chaînes entre guillemets pour éviter les faux positifs
	// quand npm/yarn apparaissent comme valeurs d'arguments texte (ex. git commit -m "...npm...",
	// gh pr create --body "...yarn...") tout en continuant à bloquer les vraies invocations
	// de gestionnaire de paquets même après des opérateurs shell (&&, ||, ;).
	const stripped = cmd
		.replace(/"(?:[^"\\]|\\.)*"/g, '""')
		.replace(/'(?:[^'\\]|\\.)*'/g, "''");
	const hit = FORBIDDEN.find(({ pattern }) => pattern.test(stripped));
	return hit
		? {
				decision: "block",
				reason: `Utiliser '${hit.replacement}' à la place. Ce projet impose pnpm (pas npm ni yarn).`,
			}
		: null;
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	const result = run(input);
	if (result) process.stdout.write(JSON.stringify(result));
}
