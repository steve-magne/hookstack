// @hookstack lib-changed-files
// Helper partagé par les hooks de fin de session (run-tests, stop-pytest,
// stop-quality-check, stop-duplication-check…).
//
// Le bug qu'il corrige : un hook qui décide de tourner en lisant uniquement
// `git status --porcelain` se désactive silencieusement quand l'arbre de travail
// redevient propre — par exemple après un commit (ou un push) en cours de session.
// Or les fichiers modifiés « en attente de validation » incluent aussi les
// commits déjà faits sur la branche depuis le merge-base avec origin/main.
// Ce helper combine les deux sources (union dédupliquée), comme le faisait déjà
// missing-test-detection.mjs — et retourne null hors dépôt git pour que les
// hooks gardent leur comportement historique (analyser quand même).
import { execSync } from "node:child_process";

/** Exécute une commande git et retourne sa sortie ("" si échec — jamais de throw). */
function defaultExec(cmd, opts = {}) {
	try {
		return execSync(cmd, {
			encoding: "utf8",
			cwd: opts.cwd,
			timeout: 10_000,
			stdio: "pipe",
			shell: true,
		}).trim();
	} catch {
		return "";
	}
}

/** Exécution tolérante : "" si la commande échoue (ou retourne null). */
function safe(exec, cmd, cwd) {
	try {
		const out = exec(cmd, { cwd });
		return (out ?? "").trim();
	} catch {
		return "";
	}
}

/** Parcourt la sortie de `git status --porcelain` (renames → cible). */
export function parsePorcelain(out) {
	return (out ?? "")
		.split("\n")
		.filter(Boolean)
		.map((l) => {
			const p = l.slice(3);
			return p.includes(" -> ") ? p.split(" -> ").pop() : p;
		});
}

/**
 * Fichiers modifiés à considérer pour la session :
 *  1. l'arbre de travail (staged + unstaged + untracked) via `git status --porcelain`
 *  2. les commits déjà faits sur la branche depuis le merge-base avec origin/main
 *     (le cas « worktree propre mais travail non livré » qui échappait aux hooks)
 *
 * Retourne un tableau dédupliqué trié, ou null hors dépôt git (les hooks
 * conservent alors leur comportement historique : tout analyser).
 */
export function changedFiles({
	exec = defaultExec,
	cwd = process.cwd(),
} = {}) {
	let porcelain;
	try {
		porcelain = exec("git status --porcelain", { cwd });
	} catch {
		return null; // hors dépôt git (ou git absent) → comportement historique
	}
	if (porcelain === null || porcelain === undefined) return null;

	const paths = parsePorcelain(porcelain);

	// Commits locaux déjà faits : diff contre le merge-base avec origin/main.
	const base = safe(exec, "git merge-base origin/main HEAD", cwd);
	const head = safe(exec, "git rev-parse HEAD", cwd);
	if (base && base !== head) {
		const committed = safe(exec, `git diff --name-only ${base} HEAD`, cwd);
		for (const f of (committed ?? "").split("\n").filter(Boolean)) paths.push(f);
	}

	return [...new Set(paths)].sort();
}
