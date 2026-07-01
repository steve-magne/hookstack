#!/usr/bin/env node
// @hookstack post-write-autoformat
// Formate le fichier avec Biome après écriture (PostToolUse Write|Edit)
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function defaultExec(cmd) {
	execSync(cmd, { stdio: "ignore", timeout: 10_000 });
}

export function run(input, { exec = defaultExec } = {}) {
	const filePath = input.tool_input?.file_path ?? "";
	if (!filePath) return null;

	try {
		exec(`npx --no-install biome check --write "${filePath}"`);
		return { formatted: filePath };
	} catch {
		// biome absent, fichier hors périmètre, ou erreurs non auto-fixables — non bloquant
		return null;
	}
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	run(input);
}
