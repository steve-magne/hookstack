#!/usr/bin/env node
// @hookstack post-compact-save-summary
// Journalise le résumé de compaction dans .claude/compaction-log.md (PostCompact)
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function run(
	input,
	{
		append = appendFileSync,
		mkdir = mkdirSync,
		projectDir = process.env.CLAUDE_PROJECT_DIR ?? ".",
		now = () => new Date().toISOString(),
	} = {},
) {
	const summary = input.compact_summary ?? "";
	if (!summary.trim()) return null;

	const logPath = join(projectDir, ".claude", "compaction-log.md");
	try {
		mkdir(dirname(logPath), { recursive: true });
	} catch {
		/* exists */
	}

	const entry = `\n## ${now()} (${input.trigger ?? "auto"})\n${summary}\n`;
	append(logPath, entry);
	return entry;
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	run(input);
}
