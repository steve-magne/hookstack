#!/usr/bin/env node
// @hookstack stop-quality-check
// Bilan qualité à la fin d'une session : typecheck + lint (Stop)
// Les tests sont volontairement exclus : run-tests.mjs (Stop) les exécute déjà
// avec un meilleur rapport d'erreur — les relancer ici doublerait la fin de session.
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Fichiers concernés par un typecheck/lint JS-TS. Une session qui ne touche que
// du Markdown, du Python ou des assets n'a rien à vérifier ici.
const JS_TS = /\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte)$/;
const QC_CFG = /(^|\/)(tsconfig.*\.json|package\.json|biome\.jsonc?)$/;

/** Fichiers modifiés en attente (staged + unstaged + untracked), ou null hors git. */
function defaultChanged(cwd) {
	try {
		const out = execSync("git status --porcelain", {
			encoding: "utf8",
			cwd,
			timeout: 5_000,
		});
		return out
			.split("\n")
			.filter(Boolean)
			.map((l) => {
				const p = l.slice(3);
				return p.includes(" -> ") ? p.split(" -> ").pop() : p;
			});
	} catch {
		return null; // hors dépôt git → ne pas court-circuiter (comportement historique)
	}
}

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
	changed = defaultChanged(process.env.CLAUDE_PROJECT_DIR ?? process.cwd()),
} = {}) {
	// Aucun fichier JS/TS (ni config tsc/biome) modifié → typecheck/lint inutiles.
	if (changed && !changed.some((f) => JS_TS.test(f) || QC_CFG.test(f)))
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
