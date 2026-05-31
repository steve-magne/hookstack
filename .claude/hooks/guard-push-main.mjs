#!/usr/bin/env node
// Bloque git push --force vers main/master (PreToolUse Bash)
import { readFileSync } from 'fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const command = input.tool_input?.command ?? '';

const isForce = /git\s+push\b.*--force(?:-with-lease)?/.test(command) ||
                /git\s+push\b.*-f\b/.test(command);
const isMain  = /\b(main|master)\b/.test(command);

if (isForce && isMain) {
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: 'Force-push vers main/master interdit. Créez une PR ou demandez confirmation explicite.',
  }));
}
