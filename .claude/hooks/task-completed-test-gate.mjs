#!/usr/bin/env node
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const input = JSON.parse(readFileSync(0, 'utf8'));
try {
  execSync('npm test --if-present 2>&1', { stdio: 'pipe', timeout: 120000 });
} catch (e) {
  const out = (e.stdout ?? e.stderr ?? e.message).toString().slice(0, 800);
  process.stderr.write(
    `Tests must pass before completing "${input.task_subject}".\n${out}`
  );
  process.exit(2);
}
