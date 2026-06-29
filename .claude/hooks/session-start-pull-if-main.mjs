#!/usr/bin/env node
// @hookstack session-start-pull-if-main
// SessionStart: si on est sur main/master et qu'il y a des commits distants, lance git pull
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function defaultExec(cmd) {
	try {
		return execSync(cmd, { encoding: "utf8", timeout: 10_000 }).trim();
	} catch {
		return "";
	}
}

function defaultPull() {
	execSync("git pull --ff-only --quiet", { encoding: "utf8", timeout: 30_000 });
}

export function run({ exec = defaultExec, pull = defaultPull } = {}) {
	const branch =
		exec("git branch --show-current") ||
		exec("git rev-parse --abbrev-ref HEAD");
	if (!branch || !/^(main|master)$/.test(branch)) return null;

	// Vérifier qu'un remote existe
	const remote = exec("git remote");
	if (!remote) return null;

	// Fetch silencieux pour connaître l'état du remote
	exec("git fetch --quiet 2>/dev/null");

	const localHash = exec("git rev-parse HEAD");
	const remoteHash = exec("git rev-parse @{u} 2>/dev/null");
	if (!remoteHash || localHash === remoteHash) return null;

	// Vérifier qu'on n'est pas en avance sur le remote (merge sûr)
	const behind = exec("git rev-list HEAD..@{u} --count");
	const ahead = exec("git rev-list @{u}..HEAD --count");
	if (parseInt(behind, 10) === 0) return null;

	if (parseInt(ahead, 10) > 0) {
		// Divergence — ne pas pull automatiquement
		return `${[
			`## ⚠️  Branche \`${branch}\` diverge du remote`,
			`- ${behind} commit(s) en retard, ${ahead} commit(s) en avance.`,
			`- Résolvez la divergence avant de continuer (\`git pull --rebase\` ou merge manuel).`,
		].join("\n")}\n`;
	}

	// Pull sans divergence
	try {
		pull();
	} catch {
		return `## ⚠️  \`git pull\` a échoué sur \`${branch}\` — synchronisez manuellement.\n`;
	}

	return `${[
		`## Dépôt synchronisé`,
		`- \`${behind}\` commit(s) récupéré(s) depuis le remote sur \`${branch}\`.`,
	].join("\n")}\n`;
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const result = run();
	if (result) process.stdout.write(result);
}
