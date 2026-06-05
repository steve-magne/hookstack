// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/file-changed-run-tests.mjs';

const fail = (stdout) => () => { const e = new Error('cmd failed'); e.stdout = Buffer.from(stdout); throw e; };

describe('file-changed-run-tests', () => {
  it('ignore un événement unlink', () => {
    expect(run({ event: 'unlink' }, { exec: vi.fn() })).toBeNull();
  });
  it('rapporte un succès', () => {
    const r = run({ file_path: 'a.ts' }, { exec: () => Buffer.from('ok') });
    expect(r?.hookSpecificOutput?.additionalContext).toContain('passed');
  });
  it('rapporte un échec', () => {
    const r = run({ file_path: 'a.ts' }, { exec: fail('test failed') });
    expect(r?.hookSpecificOutput?.additionalContext).toContain('FAILED');
  });
});
