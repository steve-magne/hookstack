#!/usr/bin/env node
// @hookstack pre-bash-enforce-java-build
// Bloque `gradle`/`mvn` nus quand le wrapper (gradlew/mvnw) existe — le wrapper
// épingle la version du toolchain pour toute l'équipe (PreToolUse Bash).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const FORBIDDEN = [
	{ re: /(^|[;&|\s`])gradle(\s|$)/, tool: "gradle", wrapper: "gradlew" },
	{ re: /(^|[;&|\s`])mvn(\s|$)/, tool: "mvn", wrapper: "mvnw" },
];

// Retire le contenu des chaînes entre guillemets pour éviter les faux positifs
// quand gradle/mvn apparaissent comme valeurs d'arguments texte (ex. git commit -m
// "...gradle...") tout en continuant à bloquer les vraies invocations.
function stripQuotedArgs(cmd) {
	return cmd
		.replace(/"(?:[^"\\]|\\.)*"/g, '""')
		.replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

export function run(
	input,
	{ exists = existsSync, projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd() } = {},
) {
	if (input.tool_name !== "Bash") return null;
	const cmd = stripQuotedArgs(input.tool_input?.command ?? "");

	const hit = FORBIDDEN.find(({ re }) => re.test(cmd));
	if (!hit) return null;

	// On n'impose le wrapper que s'il existe réellement dans le projet.
	if (!exists(join(projectDir, hit.wrapper))) return null;

	return {
		decision: "block",
		reason: `Use './${hit.wrapper}' instead of the bare '${hit.tool}' — the wrapper pins this project's ${hit.tool === "gradle" ? "Gradle" : "Maven"} version.`,
	};
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	const result = run(input);
	if (result) process.stdout.write(JSON.stringify(result));
}
