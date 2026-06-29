#!/usr/bin/env node
// @hookstack user-prompt-expansion-skill-context
// Injecte du contexte additionnel lors de l'expansion de certains skills (UserPromptExpansion)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Associe un nom de skill au contexte à injecter
const CONTEXT_MAP = {
	"code-review":
		"Check for security vulnerabilities, adherence to SOLID principles, and the conventions in CLAUDE.md.",
	"security-review":
		"Follow OWASP Top 10. Flag hardcoded secrets, injection risks, and insecure dependencies.",
};

export function run(input) {
	const skill = input.command_name ?? "";
	const ctx = CONTEXT_MAP[skill];
	if (!ctx) return null;
	return {
		hookSpecificOutput: {
			hookEventName: "UserPromptExpansion",
			additionalContext: ctx,
		},
	};
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	const result = run(input);
	if (result) process.stdout.write(JSON.stringify(result));
}
