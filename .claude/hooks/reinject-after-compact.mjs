#!/usr/bin/env node
// Réinjecte le contexte sauvegardé avant la dernière compaction (SessionStart)
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const sessionId = input.session_id ?? '';

const backupDir = '/tmp/claude-compact-backups';
if (!existsSync(backupDir)) process.exit(0);

// Cherche le backup de la session courante en priorité, sinon le plus récent
let backupFile = sessionId ? join(backupDir, `${sessionId}.json`) : null;

if (!backupFile || !existsSync(backupFile)) {
  const files = readdirSync(backupDir)
    .filter(f => f.endsWith('.json'))
    .map(f => ({ f, mtime: new Date(readFileSync(join(backupDir, f), 'utf8').split('"saved_at":"')[1]?.split('"')[0] ?? 0) }))
    .sort((a, b) => b.mtime - a.mtime);
  backupFile = files[0] ? join(backupDir, files[0].f) : null;
}

if (!backupFile || !existsSync(backupFile)) process.exit(0);

try {
  const { summary, saved_at } = JSON.parse(readFileSync(backupFile, 'utf8'));
  if (summary) {
    process.stdout.write(`## Contexte de la session précédente (avant compaction du ${saved_at})\n\n${summary}\n`);
  }
} catch {
  // Fichier corrompu — ignorer silencieusement
}
