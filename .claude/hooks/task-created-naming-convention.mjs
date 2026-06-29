#!/usr/bin/env node
// @hookstack task-created-naming-convention
// Impose une référence de ticket en tête du sujet d'une tâche (TaskCreated)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function run(input) {
  const subject = input.task_subject ?? '';
  if (/^\[[A-Z]+-\d+\]/.test(subject)) return null;
  return {
    exitCode: 2,
    message:
      `Task subject must start with a ticket reference, e.g. "[PROJ-123] ${subject}". ` +
      'Update the subject to include a valid ticket number.',
  };
}

/* v8 ignore next 6 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) {
    process.stderr.write(result.message);
    process.exit(result.exitCode);
  }
}
