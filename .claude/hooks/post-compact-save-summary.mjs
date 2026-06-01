#!/usr/bin/env node
import { readFileSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const summary = input.compact_summary ?? '';
if (!summary.trim()) process.exit(0);

const logPath = join(process.env.CLAUDE_PROJECT_DIR ?? '.', '.claude', 'compaction-log.md');
try { mkdirSync(dirname(logPath), { recursive: true }); } catch { /* exists */ }

const date = new Date().toISOString();
appendFileSync(logPath, `\n## ${date} (${input.trigger ?? 'auto'})\n${summary}\n`);
