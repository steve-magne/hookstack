#!/usr/bin/env node
// Sauvegarde le résumé de compaction dans un fichier temporaire (PreCompact)
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const summary  = input.summary ?? '';
const sessionId = input.session_id ?? `session-${Date.now()}`;

if (!summary) process.exit(0);

const backupDir = '/tmp/claude-compact-backups';
mkdirSync(backupDir, { recursive: true });

const file = join(backupDir, `${sessionId}.json`);
writeFileSync(file, JSON.stringify({
  session_id: sessionId,
  saved_at: new Date().toISOString(),
  summary,
}, null, 2));

process.stderr.write(`[pre-compact-backup] Contexte sauvegardé → ${file}\n`);
