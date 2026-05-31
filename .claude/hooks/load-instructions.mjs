#!/usr/bin/env node
// Charge les instructions agent depuis .claude/instructions.md au démarrage (SessionStart)
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const instructionsPath = join(projectDir, '.claude', 'instructions.md');

if (!existsSync(instructionsPath)) process.exit(0);

const content = readFileSync(instructionsPath, 'utf8').trim();
if (!content) process.exit(0);

// Sauvegarde dans /tmp pour que d'autres hooks puissent le lire
const tmpFile = join(tmpdir(), `claude-instructions-${process.pid}.md`);
writeFileSync(tmpFile, content);
process.stderr.write(`[load-instructions] Instructions chargées depuis .claude/instructions.md\n`);
