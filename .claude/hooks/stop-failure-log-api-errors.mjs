#!/usr/bin/env node
import { readFileSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const logPath = join(process.env.CLAUDE_PROJECT_DIR ?? '.', '.claude', 'api-errors.log');
try { mkdirSync(dirname(logPath), { recursive: true }); } catch { /* exists */ }

const date = new Date().toISOString();
const line = `${date} | ${input.error} | ${input.error_details ?? ''} | session:${input.session_id}\n`;
appendFileSync(logPath, line);
