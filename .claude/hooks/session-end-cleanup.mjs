#!/usr/bin/env node
// Nettoie les fichiers temporaires Claude datant de plus de 24h (SessionEnd)
import { readdirSync, statSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const TMP = '/tmp';
const MAX_AGE_MS = 24 * 60 * 60 * 1_000;
const PREFIX = 'claude-';

let cleaned = 0;
try {
  for (const f of readdirSync(TMP)) {
    if (!f.startsWith(PREFIX)) continue;
    const fp = join(TMP, f);
    try {
      const age = Date.now() - statSync(fp).mtimeMs;
      if (age > MAX_AGE_MS) { unlinkSync(fp); cleaned++; }
    } catch {}
  }
} catch {}

if (cleaned > 0)
  process.stderr.write(`[session-end-cleanup] ${cleaned} fichier(s) temporaire(s) supprimé(s).\n`);
