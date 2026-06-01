#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const input = JSON.parse(readFileSync(0, 'utf8'));
const cwd = input.cwd;

const has = (f) => existsSync(`${cwd}/${f}`);
const hasNodeModules = has('node_modules');
if (hasNodeModules) process.exit(0); // already installed

let cmd = null;
if (has('pnpm-lock.yaml')) cmd = 'pnpm install --frozen-lockfile';
else if (has('yarn.lock')) cmd = 'yarn install --frozen-lockfile';
else if (has('package-lock.json')) cmd = 'npm ci';
else if (has('package.json')) cmd = 'npm install';

if (cmd) {
  process.stderr.write(`[setup-install-deps] Running: ${cmd}\n`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit', timeout: 180000 });
  } catch (e) {
    process.stderr.write(`[setup-install-deps] Failed: ${e.message}\n`);
  }
}
