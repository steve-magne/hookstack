#!/usr/bin/env node
// @hookstack stop-mobile-ui-test-gate
// Bloque la fin de session lorsqu'un écran ou composant mobile est modifié sans
// test de régression ajusté dans le même diff (Stop).
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function defaultExec(command, options) {
	return execSync(command, { encoding: "utf8", timeout: 10_000, ...options });
}

function changedFiles(exec, projectDir) {
	const modified = exec("git diff --name-only HEAD", { cwd: projectDir });
	const untracked = exec("git ls-files --others --exclude-standard", {
		cwd: projectDir,
	});
	return new Set(
		[...modified.split("\n"), ...untracked.split("\n")]
			.map((file) => file.trim())
			.filter(Boolean),
	);
}

// Capture le préfixe avant src/ (rien en repo simple, "apps/mobile/" en monorepo)
// pour que le test attendu reste dans le même package — jamais de mélange entre apps.
const UI_FILE_RE = /^(.*?)src\/(screens|components)\/.+\.tsx$/;

// La structure de tests est plate (tests/screens|components/<Name>.test.tsx),
// sans miroir des sous-dossiers de src/ (ex. src/components/game/*.tsx).
function expectedTest(sourceFile) {
	const match = sourceFile.match(UI_FILE_RE);
	if (!match) return null;
	const [, prefix, kind] = match;
	const base = sourceFile
		.split("/")
		.pop()
		.replace(/\.tsx$/, ".test.tsx");
	return `${prefix}tests/${kind}/${base}`;
}

export function run(
	_input,
	{
		exec = defaultExec,
		projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
	} = {},
) {
	let files;
	try {
		files = changedFiles(exec, projectDir);
	} catch {
		return null; // pas un dépôt git ou git absent → no-op
	}

	const changedUi = [...files].filter((file) => UI_FILE_RE.test(file));
	const missingTests = changedUi.filter(
		(sourceFile) => !files.has(expectedTest(sourceFile)),
	);
	if (!missingTests.length) return null;

	return {
		exitCode: 2,
		message:
			`[mobile-ui-test-gate] Test de régression mobile non ajusté pour :\n${missingTests
				.map((file) => `  - ${file} (attendu : ${expectedTest(file)})`)
				.join("\n")}\n` +
			"→ Créer ou modifier le test correspondant avant de terminer.\n",
	};
}

/* v8 ignore next 6 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	JSON.parse(readFileSync(0, "utf8"));
	const result = run();
	if (result?.message) process.stderr.write(result.message);
	if (result?.exitCode) process.exit(result.exitCode);
}
