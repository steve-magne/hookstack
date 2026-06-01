#!/usr/bin/env node
import { readFileSync } from 'fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const skill = input.command_name ?? '';

// Map skill names to additional context to inject
const contextMap = {
  'code-review': 'Check for security vulnerabilities, adherence to SOLID principles, and the conventions in CLAUDE.md.',
  'security-review': 'Follow OWASP Top 10. Flag hardcoded secrets, injection risks, and insecure dependencies.',
};

const ctx = contextMap[skill];
if (ctx) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptExpansion',
      additionalContext: ctx,
    },
  }));
}
