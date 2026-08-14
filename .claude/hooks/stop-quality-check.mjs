#!/usr/bin/env node
// @hookstack stop-quality-check
// Bilan qualité à la fin d'une session : typecheck + lint (Stop)
// Les tests sont volontairement exclus : run-tests.mjs (Stop) les exécute déjà
// avec un meilleur rapport d'erreur — les relancer ici doublerait la fin de session.
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { changedFiles } from "./lib/changed-files.mjs";

// Fichiers concernés par un typecheck/lint JS-TS. Une session qui ne touche que
// du Markdown ou des assets n'a rien à vérifier ici.
const JS_TS = /\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte)$/;
const QC_CFG = /(^|\/)(tsconfig.*\.json|package\.json|biome\.jsonc?)$/;

// Fichiers concernés par le gate qualité Python (ruff lint + pyright types).
const PY = /\.py$/;
const PY_CFG =
	/(^|\/)(pyproject\.toml|setup\.py|setup\.cfg|pytest\.ini|ruff\.toml|\.ruff\.toml|pyrightconfig\.json)$/;

/** Scripts npm du package.json projet, ou {} si absent/illisible. */
function defaultReadScripts(projectDir) {
	try {
		return (
			JSON.parse(readFileSync(join(projectDir, "package.json"), "utf8"))
				.scripts ?? {}
		);
	} catch {
		return {};
	}
}

export function run({
	exec,
	exists = existsSync,
	readScripts = defaultReadScripts,
	projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
	changed = changedFiles({
		cwd: process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
	}),
} = {}) {
	// Aucun fichier JS/TS ni Python (ni config associée) modifié → checks inutiles.
	if (
		changed &&
		!changed.some(
			(f) => JS_TS.test(f) || QC_CFG.test(f) || PY.test(f) || PY_CFG.test(f),
		)
	)
		return { checks: 0, failed: 0, message: "" };

	const doExec =
		exec ??
		((cmd) =>
			execSync(cmd, { cwd: projectDir, stdio: "pipe", timeout: 60_000 }));

	const messages = [];
	function check(label, cmd) {
		try {
			doExec(cmd);
			messages.push(`[quality-check] ✓ ${label}\n`);
			return true;
		} catch (err) {
			const out = err.stdout?.toString()?.trim() ?? "";
			messages.push(
				`[quality-check] ✗ ${label}\n${out ? `${out.slice(-500)}\n` : ""}`,
			);
			return false;
		}
	}

	const checks = [];
	const hasPkg = exists(join(projectDir, "package.json"));
	const hasPyproject = exists(join(projectDir, "pyproject.toml"));
	if (hasPkg && exists(join(projectDir, "tsconfig.json")))
		// --incremental + cache buildinfo : la 1re run reste froide, les suivantes ne
		// retypent que ce qui a bougé → fin de session quasi instantanée côté types.
		checks.push([
			"TypeScript",
			"npx --no-install tsc --noEmit --incremental --tsBuildInfoFile node_modules/.cache/tsc/stop-quality-check.tsbuildinfo",
		]);
	const biomeConfigs = ["biome.json", "biome.jsonc"];
	if (hasPkg && biomeConfigs.some((f) => exists(join(projectDir, f)))) {
		// Limiter Biome aux fichiers JS/TS réellement modifiés : sinon --error-on-warnings
		// fait échouer le check sur de la dette préexistante ailleurs dans le repo, sans
		// rapport avec la session en cours.
		const touched = changed ? changed.filter((f) => JS_TS.test(f)) : [];
		if (touched.length > 0) {
			checks.push([
				"Biome",
				`npx --no-install biome lint --error-on-warnings ${touched.map((f) => `"${f}"`).join(" ")}`,
			]);
		} else {
			// Hors git ou changement de config seul → repo entier. Préférer le script `lint` du
			// projet (le vrai gate CI) à un `biome lint .` direct : il respecte les exclusions de
			// workspace (ex. un dossier mobile sous un gate ESLint séparé) qu'un appel biome brut ignore.
			const scripts = readScripts(projectDir);
			checks.push(
				scripts.lint
					? ["Lint", "pnpm run lint"]
					: ["Biome", "npx --no-install biome lint --error-on-warnings ."],
			);
		}
	}

	// ── Python (via uv) : ruff (lint) + pyright (types) sur les .py modifiés,
	// repo entier si la session n'a touché que des configs ou hors git.
	if (hasPyproject) {
		const touchedPy = changed ? changed.filter((f) => PY.test(f)) : [];
		checks.push(
			touchedPy.length > 0
				? [
						"Ruff",
						`uv run ruff check ${touchedPy.map((f) => `"${f}"`).join(" ")}`,
					]
				: ["Ruff", "uv run ruff check ."],
		);
		checks.push(
			touchedPy.length > 0
				? [
						"Pyright",
						`uv run pyright ${touchedPy.map((f) => `"${f}"`).join(" ")}`,
					]
				: ["Pyright", "uv run pyright"],
		);
	}

	const results = checks.map(([label, cmd]) => check(label, cmd));
	const failed = results.filter((r) => !r).length;

	if (failed > 0)
		messages.push(
			`[quality-check] ${failed}/${checks.length} vérification(s) échouée(s).\n`,
		);
	else if (checks.length > 0)
		messages.push("[quality-check] ✓ Tous les contrôles qualité passent.\n");

	return { checks: checks.length, failed, message: messages.join("") };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const result = run();
	process.stderr.write(result.message);
	if (result.failed > 0) process.exit(2);
}
