// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/post-tool-batch-typecheck.mjs';

const fail = (stdout) => () => { const e = new Error('cmd failed'); e.stdout = Buffer.from(stdout); throw e; };

describe('post-tool-batch-typecheck', () => {
  it('ignore un batch sans .ts', () => {
    expect(run({ tool_calls: [{ tool_name: 'Read', tool_input: {} }] }, { exec: vi.fn() })).toBeNull();
  });
  it('injecte les erreurs tsc en contexte', () => {
    const input = { tool_calls: [{ tool_name: 'Edit', tool_input: { file_path: 'a.ts' } }] };
    const r = run(input, { exec: fail('TS errors') });
    expect(r?.hookSpecificOutput?.additionalContext).toContain('TypeScript errors');
  });
});
