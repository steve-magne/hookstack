#!/usr/bin/env node
// @hookstack stop-failure-rate-limit-alert
// StopFailure (rate_limit) : déclenche une notification bureau via OSC-9
import { fileURLToPath } from "node:url";

export function run() {
	const seq = "\x1b]9;Claude Code — rate limit hit, paused\x07";
	return { terminalSequence: seq };
}

/* v8 ignore next 3 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	process.stdout.write(JSON.stringify(run()));
}
