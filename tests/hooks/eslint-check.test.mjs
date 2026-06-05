// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/eslint-check.mjs';

const fail = (stdout) => () => { const e = new Error('cmd failed'); e.stdout = Buffer.from(stdout); throw e; };

describe('eslint-check', () => {
  it('ignore les fichiers non-JS/TS', () => {
    expect(run({ tool_input: { file_path: 'a.css' } }, { exec: vi.fn() })).toBeNull();
  });
  it('retourne null si eslint passe', () => {
    expect(run({ tool_input: { file_path: 'a.ts' } }, { exec: vi.fn() })).toBeNull();
  });
  it('remonte les erreurs eslint', () => {
    const r = run({ tool_input: { file_path: 'a.ts' } }, { exec: fail('1:1 error') });
    expect(r?.message).toContain('ESLint');
    expect(r?.message).toContain('1:1 error');
  });
});
