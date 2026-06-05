// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/autoformat.mjs';

const fail = (stdout) => () => { const e = new Error('cmd failed'); e.stdout = Buffer.from(stdout); throw e; };

describe('autoformat', () => {
  it('formate un fichier', () => {
    const exec = vi.fn();
    expect(run({ tool_input: { file_path: 'a.ts' } }, { exec })?.formatted).toBe('a.ts');
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('prettier --write "a.ts"'));
  });
  it("ignore l'absence de fichier", () => {
    expect(run({ tool_input: {} }, { exec: vi.fn() })).toBeNull();
  });
  it('avale une erreur prettier', () => {
    expect(run({ tool_input: { file_path: 'a.ts' } }, { exec: fail('') })).toBeNull();
  });
});
