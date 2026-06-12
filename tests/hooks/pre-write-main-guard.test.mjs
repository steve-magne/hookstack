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

  it('laisse passer une écriture ciblant un autre worktree (hors mainRoot)', () => {
    expect(run({ tool_input: { file_path: '/wt/src/x.ts' } }, { exec: makeExec() })).toBeNull();
  });

  it('laisse passer une écriture dans un worktree secondaire imbriqué dans le repo principal', () => {
    // Cas réel : worktrees sous .claude/worktrees/ qui commencent par mainRoot
    const exec = makeExec({
      list: '/main  abc [main]\n/main/.claude/worktrees/session-abc  def [claude/session-abc]',
    });
    expect(run(
      { tool_input: { file_path: '/main/.claude/worktrees/session-abc/src/lib/site.ts' } },
      { exec },
    )).toBeNull();
  });

  it('bloque une écriture dans .claude/hooks/ du repo principal (pas un worktree)', () => {
    const exec = makeExec({
      list: '/main  abc [main]\n/main/.claude/worktrees/session-abc  def [claude/session-abc]',
    });
    const r = run({ tool_input: { file_path: '/main/.claude/hooks/my-hook.mjs' } }, { exec });
    expect(r?.decision).toBe('block');
  });
});
