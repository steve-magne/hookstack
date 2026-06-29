#!/usr/bin/env node
// @hookstack notification-slack
import { execSync } from "node:child_process";
// @hookstack notification-slack
// Envoie une notification Slack quand Claude veut notifier l'utilisateur (Notification)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function defaultExec(cmd) {
	execSync(cmd, { stdio: "ignore", timeout: 10_000 });
}

export function run(
	input,
	{
		exec = defaultExec,
		webhook = process.env.SLACK_WEBHOOK_URL ?? "",
		projectDir = process.env.CLAUDE_PROJECT_DIR,
	} = {},
) {
	if (!webhook) return null;

	const message = input.message ?? input.notification ?? "";
	if (!message) return null;

	const project = projectDir?.split("/").pop() ?? "Claude";
	const payload = JSON.stringify({ text: `*[${project}]* ${message}` });

	try {
		exec(
			`curl -s -X POST -H 'Content-type: application/json' --data '${payload.replace(/'/g, "'\\''")}' '${webhook}'`,
		);
	} catch {
		// Échec réseau — non bloquant
	}
	return payload;
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	run(input);
}
