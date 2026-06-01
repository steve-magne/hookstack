#!/usr/bin/env node
import { readFileSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const logPath = join(process.env.CLAUDE_PROJECT_DIR ?? '.', '.claude', 'instructions-audit.log');
try { mkdirSync(dirname(logPath), { recursive: true }); } catch { /* exists */ }

const date = new Date().toISOString();
const line = `${date} | ${input.memory_type} | ${input.load_reason} | ${input.file_path}\n`;
appendFileSync(logPath, line);
