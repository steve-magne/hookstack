#!/usr/bin/env node
// @hookstack post-edit-pyright
import { execSync } from "node:child_process";
// @hookstack post-edit-pyright
// Vérifie les types Python avec pyright après édition (PostToolUse Write|Edit)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function defaultExec(cmd) {
	return execSync(cmd, { encoding: "utf8", stdio: "pipe", timeout: 30_000 });
}

export function run(input, { exec = defaultExec } = {}) {
	const filePath = input.tool_input?.file_path ?? input.tool_input?.path ?? "";
	if (!filePath.endsWith(".py")) return null;

	try {
		exec(`uv run pyright "${filePath}"`);
		return null;
	} catch (err) {
		const output = err.stdout?.toString() ?? "";
		return output ? { message: `[pyright] ${output.trim()}\n` } : null;
	}
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	const result = run(input);
	if (result?.message) process.stderr.write(result.message);
}
