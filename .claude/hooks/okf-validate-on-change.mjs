#!/usr/bin/env node
// @hookstack okf-validate-on-change
// Valide le bundle OKF (frontmatter notamment) dès qu'un fichier okf/**/*.md
// change (FileChanged) — feedback immédiat au lieu d'attendre node scripts/okf.mjs validate.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function defaultExec(projectDir) {
	return execSync("node scripts/okf.mjs validate --strict --json", {
		timeout: 15_000,
		cwd: projectDir,
		encoding: "utf8",
		stdio: "pipe",
	});
}

export function run(
	input,
	{ exec = defaultExec, projectDir = process.env.CLAUDE_PROJECT_DIR } = {},
) {
	const filePath = input.file_path ?? "";
	if (!/(^|\/)okf\/.*\.md$/.test(filePath) || !projectDir) return null;

	let out;
	try {
		out = exec(projectDir);
	} catch (e) {
		out = e?.stdout ?? "";
	}

	let report;
	try {
		report = JSON.parse(out);
	} catch {
		return null; // sortie inattendue → ne pas bloquer sur un souci d'outillage
	}
	if (report.passed) return null; // conforme → silencieux

	return {
		hookSpecificOutput: {
			hookEventName: "FileChanged",
			additionalContext:
				`okf/ bundle is INVALID against OKF v0.1 (strict mode):\n` +
				report.errors.map((e) => `✗ ERROR  ${e}`).join("\n") +
				(report.errors.length && report.warnings.length ? "\n" : "") +
				report.warnings.map((w) => `! warn   ${w}`).join("\n") +
				`\nFix the entries above (frontmatter, broken links) before continuing.`,
		},
	};
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	const result = run(input);
	if (result) process.stdout.write(JSON.stringify(result));
}
