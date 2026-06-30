#!/usr/bin/env node
// @hookstack session-start-okf-staleness
// Auto-bonification OKF : à chaque démarrage de session, vérifie la fraîcheur du bundle.
// Silencieux si frais (zéro bruit, zéro token). Si périmé, injecte une consigne d'enrichissement.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

function defaultExec(cmd) {
	try {
		return execSync(cmd, { encoding: "utf8", timeout: 5_000 }).trim();
	} catch (e) {
		// okf.mjs stale sort en code 2 quand STALE → execSync throw mais stdout est dans e
		return e?.stdout?.toString().trim() || "";
	}
}

export function run({ exec = defaultExec, exists = existsSync } = {}) {
	if (!exists("scripts/okf.mjs") || !exists("okf/log.md")) return null;
	const out = exec("node scripts/okf.mjs stale");
	if (!out.includes("STALE")) return null; // frais → rien injecter
	return [
		"## OKF — bundle de connaissance périmé",
		out,
		"",
		"**Avant de clore cette session**, lancer la passe d'enrichissement OKF :",
		"déléguer au sous-agent `okf-librarian` (mode ENRICHISSEMENT) ou suivre",
		"`okf/meta/self-improvement.md`. Terminer par `node scripts/okf.mjs validate`",
		"et une entrée datée dans `okf/log.md`.",
		"",
	].join("\n");
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const result = run();
	if (result) process.stdout.write(result);
}
