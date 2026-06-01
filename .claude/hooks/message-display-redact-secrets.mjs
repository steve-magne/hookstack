#!/usr/bin/env node
import { readFileSync } from 'fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const delta = input.delta ?? '';

const redacted = delta
  .replace(/sk-(?:ant-api03-|proj-)[A-Za-z0-9_-]{20,}/g, '[REDACTED-ANTHROPIC-KEY]')
  .replace(/sk-[A-Za-z0-9]{20,}/g, '[REDACTED-API-KEY]')
  .replace(/ghp_[A-Za-z0-9]{36}/g, '[REDACTED-GH-TOKEN]')
  .replace(/ghs_[A-Za-z0-9]{36}/g, '[REDACTED-GH-TOKEN]')
  .replace(/Bearer [A-Za-z0-9_\-\.]{20,}/g, 'Bearer [REDACTED]');

if (redacted !== delta) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'MessageDisplay',
      displayContent: redacted,
    },
  }));
}
