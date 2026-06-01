#!/usr/bin/env node
import { readFileSync } from 'fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const subject = input.task_subject ?? '';

if (!/^\[[A-Z]+-\d+\]/.test(subject)) {
  process.stderr.write(
    `Task subject must start with a ticket reference, e.g. "[PROJ-123] ${subject}". ` +
    'Update the subject to include a valid ticket number.'
  );
  process.exit(2);
}
