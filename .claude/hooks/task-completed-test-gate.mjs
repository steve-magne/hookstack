#!/usr/bin/env node
// @hookstack task-completed-test-gate
import { execSync } from "node:child_process";
// @hookstack task-completed-test-gate
// Bloque la complétion d'une tâche si les tests échouent (TaskCompleted)
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

function defaultExec(cmd) {
	return execSync(cmd, { stdio: "pipe", timeout: 120_000 });
}

// Détecte le gestionnaire de paquets depuis le lockfile (cohérent avec enforce-package-managers).
function detectManager({
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

const PY_MARKERS = ["pyproject.toml", "setup.py", "setup.cfg", "pytest.ini"];

// Le gate Python ne s'arme que si le projet déclare réellement des tests
// (pytest.ini explicite ou dossier tests/) — sinon `uv run pytest` exit 5
// (no tests ran) bloquerait la complétion de chaque tâche sur un projet sans
// test. pyproject.toml seul ne suffit pas : tout projet uv en possède un.
function hasPythonTests({ exists, projectDir }) {
	if (!PY_MARKERS.some((f) => exists(join(projectDir, f)))) return false;
	if (exists(join(projectDir, "pytest.ini"))) return true;
	return exists(join(projectDir, "tests")) || exists(join(projectDir, "test"));
}

export function run(
	input,
	{
		exec = defaultExec,
		exists = existsSync,
		projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
	} = {},
) {
	const commands = [];
	// Python : gate pytest via uv (même outil que stop-pytest).
	if (hasPythonTests({ exists, projectDir })) commands.push("uv run pytest -q");
	// Node : gate sur le gestionnaire détecté, `--if-present` pour sauter sans script test.
	if (exists(join(projectDir, "package.json")))
		commands.push(`${detectManager({ exists, projectDir })} test --if-present 2>&1`);
	try {
		for (const cmd of commands) exec(cmd);
		return null;
	} catch (e) {
		const out = (e.stdout ?? e.stderr ?? e.message).toString().slice(0, 800);
		return {
			exitCode: 2,
			message: `Tests must pass before completing "${input.task_subject}".\n${out}`,
		};
	}
}

/* v8 ignore next 6 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	const result = run(input);
	if (result) {
		process.stderr.write(result.message);
		process.exit(result.exitCode);
	}
}
