#!/usr/bin/env node
// @hookstack pre-bash-enforce-uv
// Bloque pip/poetry install et suggère l'équivalent uv (PreToolUse Bash)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BLOCKED = [
	{ re: /(^|[;&|\s`])pip\s+install\b/, fix: "uv add" },
	{ re: /(^|[;&|\s`])pip3\s+install\b/, fix: "uv add" },
	{ re: /(^|[;&|\s`])poetry\s+add\b/, fix: "uv add" },
	{ re: /(^|[;&|\s`])poetry\s+install\b/, fix: "uv sync" },
];

// Retire le contenu des chaînes entre guillemets pour éviter les faux positifs
// quand pip/poetry apparaissent comme valeurs d'arguments texte (ex. git commit -m
// "pip install ..."), tout en continuant à bloquer les vraies invocations.
function stripQuotedArgs(cmd) {
	return cmd
		.replace(/"(?:[^"\\]|\\.)*"/g, '""')
		.replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

export function run(input) {
	if (input.tool_name !== "Bash") return null;
	const cmd = stripQuotedArgs(input.tool_input?.command ?? "");

	const hit = BLOCKED.find(({ re }) => re.test(cmd));
	if (!hit) return null;

	return {
		decision: "block",
		reason: `Use '${hit.fix}' instead — this project manages dependencies with uv.`,
	};
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	const result = run(input);
	if (result) process.stdout.write(JSON.stringify(result));
}
