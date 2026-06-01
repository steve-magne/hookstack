#!/usr/bin/env node
// StopFailure (rate_limit): fire a desktop notification via OSC-9
const seq = '\x1b]9;Claude Code — rate limit hit, paused\x07';
process.stdout.write(JSON.stringify({ terminalSequence: seq }));
