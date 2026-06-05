// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/typecheck.mjs';

const fail = (stdout) => () => { const e = new Error('cmd failed'); e.stdout = Buffer.from(stdout); throw e; };

describe('typecheck', () => {
  it('ignore les fichiers non-TS', () => {
    expect(run({ tool_input: { file_path: 'a.js' } }, { exec: vi.fn(), projectDir: '/p' })).toBeNull();
  });
  it('remonte les erreurs tsc', () => {
    const r = run({ tool_input: { file_path: 'a.ts' } }, { exec: fail('TS2322'), projectDir: '/p' });
    expect(r?.message).toContain('TypeScript');
  });
});
