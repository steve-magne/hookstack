// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/setup-worktree-env.mjs';

const MAIN = '/repos/hookit';
const WORKTREE = '/repos/hookit-wt';

function makeExec(main = MAIN, wt = WORKTREE) {
  return (cmd) => {
    if (cmd === 'git worktree list') return `${main}  abc1234 [main]\n${wt}  def5678 [feature]`;
    if (cmd === 'git rev-parse --show-toplevel') return wt;
    return '';
  };
}

describe('setup-worktree-env', () => {
  it('ne fait rien si mainDir est vide', () => {
    const copy = vi.fn();
    run({ exec: () => '', exists: () => false, copy });
    expect(copy).not.toHaveBeenCalled();
  });

  it('ne fait rien si mainDir === worktreeDir', () => {
    const copy = vi.fn();
    run({ exec: makeExec(MAIN, MAIN), exists: () => false, copy });
    expect(copy).not.toHaveBeenCalled();
  });

  it('copie .env si présent dans main et absent dans worktree', () => {
    const copy = vi.fn();
    const exists = (p) => p === `${MAIN}/.env`;
    run({ exec: makeExec(), exists, copy });
    expect(copy).toHaveBeenCalledWith(`${MAIN}/.env`, `${WORKTREE}/.env`);
  });

  it('ne copie pas si le fichier existe déjà dans le worktree', () => {
    const copy = vi.fn();
    const exists = () => true;
    run({ exec: makeExec(), exists, copy });
    expect(copy).not.toHaveBeenCalled();
  });

  it('copie plusieurs fichiers .env manquants', () => {
    const copy = vi.fn();
    const exists = (p) => p.startsWith(MAIN + '/') && !p.includes('development');
    run({ exec: makeExec(), exists, copy });
    expect(copy).toHaveBeenCalledTimes(2);
  });

  it('ne copie pas si le fichier source est absent', () => {
    const copy = vi.fn();
    run({ exec: makeExec(), exists: () => false, copy });
    expect(copy).not.toHaveBeenCalled();
  });
});
