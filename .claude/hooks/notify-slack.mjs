#!/usr/bin/env node
// Envoie une notification Slack quand Claude veut notifier l'utilisateur (Notification)
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const WEBHOOK = process.env.SLACK_WEBHOOK_URL ?? '';
if (!WEBHOOK) process.exit(0);

const input = JSON.parse(readFileSync(0, 'utf8'));
const message = input.message ?? input.notification ?? '';
if (!message) process.exit(0);

const project = process.env.CLAUDE_PROJECT_DIR?.split('/').pop() ?? 'Claude';
const payload = JSON.stringify({
  text: `*[${project}]* ${message}`,
});

try {
  execSync(`curl -s -X POST -H 'Content-type: application/json' --data '${payload.replace(/'/g, "'\\''")}' '${WEBHOOK}'`, {
    stdio: 'ignore',
    timeout: 10_000,
  });
} catch {
  // Échec réseau — non bloquant
}
