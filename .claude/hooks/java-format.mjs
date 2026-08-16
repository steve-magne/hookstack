#!/usr/bin/env node
// @hookstack post-write-java-format
// Formate le fichier .java avec google-java-format après écriture (PostToolUse Write|Edit)
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function defaultExec(cmd) {
	return execSync(cmd, { encoding: "utf8", stdio: "pipe", timeout: 20_000 });
}

export function run(input, { exec = defaultExec } = {}) {
	const filePath = input.tool_input?.file_path ?? input.tool_input?.path ?? "";
	if (!filePath.endsWith(".java")) return null;

	try {
		exec(`google-java-format -i "${filePath}"`);
		return null;
	} catch (err) {
		// google-java-format absent — non bloquant ; une erreur de parse (stdout/stderr)
		// est remontée à l'agent pour être corrigée dans la même boucle.
		const output =
			(err.stdout ?? err.stderr)?.toString()?.trim() ?? "";
		return output ? { message: `[java-format] ${output}\n` } : null;
	}
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	const result = run(input);
	if (result?.message) process.stderr.write(result.message);
}
