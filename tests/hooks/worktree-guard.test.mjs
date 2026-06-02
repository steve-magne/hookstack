// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/worktree-guard.mjs';

// Simule un worktree secondaire /wt distinct du repo principal /main.
function makeExec({ toplevel = '/wt', list = '/main  abc [main]\n/wt  def [feat]' } = {}) {
  return (cmd) => {
    if (cmd.includes('show-toplevel')) return toplevel;
    if (cmd.includes('worktree list')) return list;
    return '';
  };
}

describe('worktree-guard', () => {
  it('bloque une écriture hors du worktree courant', () => {
    const r = run({ tool_input: { file_path: '/main/src/x.ts' } }, { exec: makeExec() });
    expect(r?.decision).toBe('block');
  });

  it('laisse passer une écriture dans le worktree courant', () => {
    expect(run({ tool_input: { file_path: '/wt/src/x.ts' } }, { exec: makeExec() })).toBeNull();
  });

  it('ne s\'applique pas dans le worktree principal', () => {
    const exec = makeExec({ toplevel: '/main' });
    expect(run({ tool_input: { file_path: '/elsewhere/x.ts' } }, { exec })).toBeNull();
  });

  it('laisse passer si file_path absent', () => {
    expect(run({ tool_input: {} }, { exec: makeExec() })).toBeNull();
  });

  it('laisse passer si git échoue', () => {
    const exec = () => { throw new Error('not a git repo'); };
    expect(run({ tool_input: { file_path: '/x' } }, { exec })).toBeNull();
  });
});
