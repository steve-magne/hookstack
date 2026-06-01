#!/usr/bin/env node
import { readFileSync, existsSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const p = input.worktree_path;
if (!p) process.exit(0);

try {
  if (existsSync(join(p, 'docker-compose.yml')) || existsSync(join(p, 'docker-compose.yaml'))) {
    execSync(`docker compose -f ${p}/docker-compose.yml down --remove-orphans 2>&1`, { timeout: 30000 });
  }
} catch { /* ignore */ }

try {
  const nm = join(p, 'node_modules');
  if (existsSync(nm)) rmSync(nm, { recursive: true, force: true });
} catch { /* ignore */ }
