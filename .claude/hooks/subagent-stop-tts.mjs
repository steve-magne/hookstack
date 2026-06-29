#!/usr/bin/env node
// @hookstack subagent-stop-tts-summary
import { execSync } from "node:child_process";
// @hookstack subagent-stop-tts-summary
// Annonce la fin d'un sous-agent par TTS (SubagentStop)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function defaultExec(cmd) {
	execSync(cmd, { timeout: 10_000, stdio: "ignore", shell: true });
}

export function run(
	input,
	{ exec = defaultExec, platform = process.platform } = {},
) {
	const summary = input?.summary ?? "";
	const text = summary
		? `Sous-agent terminé : ${summary.slice(0, 100).replace(/[`*_#]/g, "")}`
		: "Sous-agent terminé";
	const safe = text.replace(/"/g, '\\"');

	try {
		if (platform === "darwin") exec(`say "${safe}"`);
		else exec(`espeak "${safe}" 2>/dev/null`);
	} catch {}
	return text;
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	let input = {};
	try {
		input = JSON.parse(readFileSync(0, "utf8"));
	} catch {}
	run(input);
}
