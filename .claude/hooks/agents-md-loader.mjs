#!/usr/bin/env node
// @hookstack session-start-agents-md
// Charge AGENTS.md comme contexte supplémentaire au démarrage de session (SessionStart)
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export function run(
	_input,
	{
		projectDir = process.env.CLAUDE_PROJECT_DIR,
		readFile = readFileSync,
		fileExists = existsSync,
	} = {},
) {
	if (!projectDir) return null;

	const agentsPath = join(projectDir, "AGENTS.md");
	if (!fileExists(agentsPath)) return null;

	const content = readFile(agentsPath, "utf8");
	if (!content.trim()) return null;

	return {
		hookSpecificOutput: {
			hookEventName: "SessionStart",
			additionalContext: content,
		},
	};
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	const result = run(input);
	if (result) process.stdout.write(JSON.stringify(result));
}
