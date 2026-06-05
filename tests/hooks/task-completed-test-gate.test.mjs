// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/task-completed-test-gate.mjs';

describe('task-completed-test-gate', () => {
  it('passe si les tests réussissent', () => {
    expect(run({ task_subject: 'x' }, { exec: vi.fn() })).toBeNull();
  });
  it('bloque si les tests échouent', () => {
    const exec = () => { const e = new Error('fail'); e.stdout = Buffer.from('1 failed'); throw e; };
    const r = run({ task_subject: 'Ma tâche' }, { exec });
    expect(r.exitCode).toBe(2);
    expect(r.message).toContain('Ma tâche');
  });
});
