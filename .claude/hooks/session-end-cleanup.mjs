#!/usr/bin/env node
// @hookstack session-end-cleanup-temp
// Nettoie les fichiers temporaires Claude datant de plus de 24h (SessionEnd)
import { readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_AGE_MS = 24 * 60 * 60 * 1_000;
const PREFIX = "claude-";

export function run({
	readdir = readdirSync,
	stat = statSync,
	unlink = unlinkSync,
	tmp = "/tmp",
	maxAge = MAX_AGE_MS,
	now = () => Date.now(),
} = {}) {
	let cleaned = 0;
	try {
		for (const f of readdir(tmp)) {
			if (!f.startsWith(PREFIX)) continue;
			const fp = join(tmp, f);
			try {
				const age = now() - stat(fp).mtimeMs;
				if (age > maxAge) {
					unlink(fp);
					cleaned++;
				}
			} catch {}
		}
	} catch {}

	return cleaned > 0
		? {
				cleaned,
				message: `[session-end-cleanup] ${cleaned} fichier(s) temporaire(s) supprimé(s).\n`,
			}
		: { cleaned: 0 };
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const result = run();
	if (result?.message) process.stderr.write(result.message);
}
