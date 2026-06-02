// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/pre-write-main-guard.mjs';

function makeExec({ branch = 'main', toplevel = '/main', list = '/main  abc [main]' } = {}) {
  return (cmd) => {
    if (cmd.includes('branch --show-current')) return branch;
    if (cmd.includes('abbrev-ref')) return branch;
    if (cmd.includes('worktree list')) return list;
    if (cmd.includes('show-toplevel')) return toplevel;
    return '';
  };
}

describe('pre-write-main-guard', () => {
  it('bloque une écriture sur main dans le repo principal', () => {
    const r = run({ tool_input: { file_path: '/main/src/x.ts' } }, { exec: makeExec() });
    expect(r?.decision).toBe('block');
    expect(r?.reason).toContain('main');
  });

  it('laisse passer sur une branche de feature', () => {
    expect(run({ tool_input: { file_path: '/main/src/x.ts' } }, { exec: makeExec({ branch: 'feat/x' }) })).toBeNull();
  });

  it('laisse passer si on est dans un worktree secondaire', () => {
    const exec = makeExec({ toplevel: '/wt' });
    expect(run({ tool_input: { file_path: '/wt/src/x.ts' } }, { exec })).toBeNull();
  });

  it('laisse passer une écriture ciblant un autre worktree', () => {
    expect(run({ tool_input: { file_path: '/wt/src/x.ts' } }, { exec: makeExec() })).toBeNull();
  });
});
