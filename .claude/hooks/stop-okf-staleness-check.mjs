#!/usr/bin/env node
// @hookstack stop-okf-staleness-check
// Auto-bonification OKF : à la fin de session, rappelle si le bundle est périmé
// et n'a pas été enrichi pendant la session. Réutilise la détection de
// okf-staleness-check.mjs (SessionStart) — même règle, message adapté au Stop. (Stop)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { run as checkOkfStale } from "./okf-staleness-check.mjs";

export function run(_input, deps) {
	const context = checkOkfStale(deps);
	if (!context) return null;
	return {
		message: `[okf-staleness] Bundle OKF périmé — enrichir avant de clore la session :\n${context}`,
	};
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	const result = run(input);
	if (result?.message) process.stderr.write(result.message);
}
