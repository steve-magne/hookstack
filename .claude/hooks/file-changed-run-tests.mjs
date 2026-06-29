#!/usr/bin/env node
// @hookstack file-changed-run-tests
import { execSync } from "node:child_process";
// @hookstack file-changed-run-tests
// Relance les tests impactés quand un fichier source change (FileChanged)
// Si vitest est disponible : `vitest related --run <fichier>` ne rejoue que les
// tests qui importent le fichier modifié (latence et tokens minimaux).
// Sinon, repli sur le script `test` du gestionnaire de paquets du projet.
// CI=true force le mode non-watch (évite un hook qui pend jusqu'au timeout).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

function defaultExec(cmd) {
	return execSync(cmd, {
		timeout: 90_000,
		env: { ...process.env, CI: "true" },
	});
}

// Détecte le gestionnaire de paquets depuis le lockfile (cohérent avec enforce-package-managers).
export function detectManager({
	exists = existsSync,
	projectDir = process.cwd(),
} = {}) {
	if (exists(join(projectDir, "pnpm-lock.yaml"))) return "pnpm";
	if (
		exists(join(projectDir, "bun.lockb")) ||
		exists(join(projectDir, "bun.lock"))
	)
		return "bun";
	if (exists(join(projectDir, "yarn.lock"))) return "yarn";
	return "npm";
}

export function run(
	input,
	{
		exec = defaultExec,
		exists = existsSync,
		projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
	} = {},
) {
	if (input.event === "unlink") return null;

	const filePath = input.file_path ?? "";
	const hasVitest = exists(join(projectDir, "node_modules", ".bin", "vitest"));
	const cmd =
		hasVitest && filePath
			? `npx --no-install vitest related --run "${filePath}" 2>&1`
			: `${detectManager({ exists, projectDir })} test --if-present 2>&1`;

	try {
		const out = exec(cmd).toString();
		return {
			hookSpecificOutput: {
				hookEventName: "FileChanged",
				additionalContext: `Tests passed after ${filePath} changed.\n${out.slice(-500)}`,
			},
		};
	} catch (e) {
		const out = (e.stdout ?? e.stderr ?? e.message).toString().slice(0, 1000);
		return {
			hookSpecificOutput: {
				hookEventName: "FileChanged",
				additionalContext: `Tests FAILED after ${filePath} changed:\n${out}`,
			},
		};
	}
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	const result = run(input);
	if (result) process.stdout.write(JSON.stringify(result));
}
