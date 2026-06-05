// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/task-created-naming-convention.mjs';

describe('task-created-naming-convention', () => {
  it('accepte un sujet avec ticket', () => {
    expect(run({ task_subject: '[PROJ-123] faire X' })).toBeNull();
  });
  it('rejette un sujet sans ticket', () => {
    const r = run({ task_subject: 'faire X' });
    expect(r.exitCode).toBe(2);
    expect(r.message).toContain('ticket reference');
  });
});
