#!/usr/bin/env node
// @hookstack user-prompt-inject-datetime
// Injecte la date et l'heure courantes dans chaque prompt (UserPromptSubmit)
import { fileURLToPath } from "node:url";

// Format neutre (ISO-like) : aucune locale codée en dur — déterministe pour les tests.
function pad(n) {
	return String(n).padStart(2, "0");
}

export function run({ now = new Date() } = {}) {
	const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
	const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
	const offsetMin = -now.getTimezoneOffset();
	const sign = offsetMin >= 0 ? "+" : "-";
	const tz = `UTC${sign}${pad(Math.floor(Math.abs(offsetMin) / 60))}:${pad(Math.abs(offsetMin) % 60)}`;
	return `Date et heure courantes : ${date} ${time} (${tz})\n`;
}

/* v8 ignore next 3 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	process.stdout.write(run());
}
