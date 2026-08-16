#!/usr/bin/env node
// @hookstack post-edit-java-compile
// Vérifie la compilation Java après édition (PostToolUse Write|Edit)
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { detectBuildTool } from "./lib/java-build.mjs";

function makeDefaultExec(projectDir) {
	return (cmd) =>
		execSync(cmd, { cwd: projectDir, stdio: "pipe", timeout: 60_000 });
}

export function run(
	input,
	{ exec, exists, projectDir = process.env.CLAUDE_PROJECT_DIR, platform } = {},
) {
	const filePath = input.tool_input?.file_path ?? input.tool_input?.path ?? "";
	if (!filePath.endsWith(".java")) return null;

	const cwd = projectDir ?? process.cwd();
	const build = detectBuildTool({ exists, projectDir: cwd, platform });
	if (!build) return null; // pas d'outil de build Java reconnu

	const doExec = exec ?? makeDefaultExec(cwd);
	const task = build.tool === "maven" ? "compile" : "compileJava";
	try {
		doExec(`${build.cmd} -q ${task}`);
		return null;
	} catch (err) {
		const output = err.stdout?.toString() ?? "";
		return output ? { message: `[java-compile] ${output.trim()}\n` } : null;
	}
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	const result = run(input);
	if (result?.message) process.stderr.write(result.message);
}
