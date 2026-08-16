#!/usr/bin/env node
// @hookstack stop-java-test
// Exécute les tests Java à la fin d'une session (Stop)
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { changedFiles } from "./lib/changed-files.mjs";
import { detectBuildTool } from "./lib/java-build.mjs";

const JAVA_MARKERS = [
	"pom.xml",
	"build.gradle",
	"build.gradle.kts",
	"settings.gradle",
	"settings.gradle.kts",
];
const JAVA = /\.java$/;
const JAVA_CFG =
	/(^|\/)(pom\.xml|build\.gradle(\.kts)?|settings\.gradle(\.kts)?)$/;

export function run({
	exists = existsSync,
	exec,
	cwd = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
	changed = changedFiles({
		cwd: process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
	}),
	platform = process.platform,
} = {}) {
	const isJava = JAVA_MARKERS.some((f) => exists(join(cwd, f)));
	if (!isJava) return null;

	// Aucun .java (ni config de build) modifié → inutile de relancer toute la suite.
	if (changed && !changed.some((f) => JAVA.test(f) || JAVA_CFG.test(f)))
		return null;

	const build = detectBuildTool({ exists, projectDir: cwd, platform });
	if (!build) return null;

	const doExec =
		exec ??
		((cmd) =>
			execSync(cmd, { cwd, encoding: "utf8", timeout: 600_000, stdio: "pipe" }));

	try {
		const out = doExec(`${build.cmd} -q test`);
		const last = String(out ?? "")
			.split("\n")
			.filter(Boolean)
			.slice(-5)
			.join("\n");
		return { status: 0, message: `[java-test] ✓ Tests passés\n${last}\n` };
	} catch (err) {
		const status = err.status ?? 1;
		const out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
		return {
			status,
			message: `[java-test] ÉCHEC (exit ${status})\n${String(out).slice(-2000)}\n`,
		};
	}
}

/* v8 ignore next 6 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const result = run();
	if (result) {
		process.stderr.write(result.message);
		if (result.status !== 0) process.exit(2);
	}
}
