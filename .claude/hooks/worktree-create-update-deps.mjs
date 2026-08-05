#!/usr/bin/env node
// @hookstack worktree-create-update-deps
// SessionStart : si la session démarre dans un worktree avec node_modules absent OU
// périmé (pnpm-lock.yaml modifié depuis — ex. merge/rebase amenant une dépendance
// ajoutée sur main après la création du worktree), lance l'install des dépendances
// en process DÉTACHÉ pour ne pas bloquer le démarrage de session, puis rend la main
// immédiatement.
// Absence vs staleness : un simple `exists(node_modules)` (l'ancien comportement) ne
// détecte que le worktree neuf — un worktree réutilisé avec node_modules déjà présent
// mais dont le lockfile a bougé depuis restait un no-op permanent, laissant passer des
// `tsc` error TS2307 sur des deps déclarées-mais-jamais-installées pour des bugs
// "préexistants" (vécu : PR #296, apps/mobile/@react-native-async-storage — corrigé par
// un simple `pnpm install`, aucune ligne de code en cause). D'où la comparaison de
// mtime, alignée sur celle déjà faite (mais seulement en warning non-actionné) par
// setup-check-deps.mjs.
// NB : ce hook NE s'enregistre PAS sur WorktreeCreate — ce dernier remplace la création
// du worktree, exige un chemin absolu sur stdout et ne supporte pas l'exécution async.
import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

/* v8 ignore next 3 */
function defaultExec(cmd, opts = {}) {
	try {
		return execSync(cmd, { encoding: "utf8", timeout: 10_000, ...opts }).trim();
	} catch {
		return "";
	}
}

/* v8 ignore next 8 */
function defaultDetach(cmd, args, cwd) {
	const child = spawn(cmd, args, {
		cwd,
		detached: true,
		stdio: "ignore",
	});
	child.unref();
}

export function run({
	exec = defaultExec,
	exists = existsSync,
	stat = statSync,
	detach = defaultDetach,
} = {}) {
	const worktreeDir = exec("git rev-parse --show-toplevel");
	if (!worktreeDir) return;

	// Uniquement dans un worktree distinct du dépôt principal.
	const mainDir =
		exec("git worktree list").split("\n")[0]?.split(/\s+/)[0] ?? "";
	if (!mainDir || mainDir === worktreeDir) return;

	// Rien à faire sans package.json.
	if (!exists(`${worktreeDir}/package.json`)) return;

	// Node_modules déjà là : réinstaller seulement s'il est périmé (lockfile plus
	// récent — voir note en tête de fichier), pas à chaque démarrage de session.
	const modulesDir = `${worktreeDir}/node_modules`;
	if (exists(modulesDir)) {
		const lockfile = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock"]
			.map((f) => `${worktreeDir}/${f}`)
			.find(exists);
		const stale = lockfile && stat(lockfile).mtimeMs > stat(modulesDir).mtimeMs;
		if (!stale) return;
	}

	const hasPnpm = exec("which pnpm");
	if (hasPnpm) {
		detach(
			"pnpm",
			["install", "--frozen-lockfile", "--ignore-scripts"],
			worktreeDir,
		);
	} else {
		detach("npm", ["ci", "--ignore-scripts"], worktreeDir);
	}
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	readFileSync(0, "utf8");
	run();
	// SessionStart : pas de stdout obligatoire (install lancé en détaché).
}
