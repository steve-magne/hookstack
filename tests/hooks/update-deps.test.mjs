// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/update-deps.mjs';

const MAIN = '/repos/hookstack';
const WORKTREE = '/repos/hookstack-wt';

// exec stub : git rev-parse → worktree, git worktree list → main en 1re ligne, which pnpm paramétrable
function makeExec(wt = WORKTREE, main = MAIN, pnpm = '/usr/local/bin/pnpm') {
  return (cmd) => {
    if (cmd.includes('rev-parse')) return wt;
    if (cmd.includes('worktree list')) return `${main}  abc1234 [main]\n${wt}  def5678 [feature]`;
    if (cmd.includes('which pnpm')) return pnpm;
    return '';
  };
}

describe('update-deps', () => {
  it('ne fait rien si git rev-parse échoue', () => {
    const detach = vi.fn();
    run({ exec: () => '', exists: () => true, detach });
    expect(detach).not.toHaveBeenCalled();
  });

  it('ne fait rien hors worktree (mainDir === worktreeDir)', () => {
    const detach = vi.fn();
    run({ exec: makeExec(MAIN, MAIN), exists: () => false, detach });
    expect(detach).not.toHaveBeenCalled();
  });

  it('ne fait rien si package.json absent', () => {
    const detach = vi.fn();
    run({ exec: makeExec(), exists: () => false, detach });
    expect(detach).not.toHaveBeenCalled();
  });

  it('ne fait rien si node_modules déjà présent', () => {
    const detach = vi.fn();
    const exists = () => true; // package.json ET node_modules présents
    run({ exec: makeExec(), exists, detach });
    expect(detach).not.toHaveBeenCalled();
  });

  it('détache pnpm install dans un worktree neuf', () => {
    const detach = vi.fn();
    const exists = (p) => p === `${WORKTREE}/package.json`; // pas de node_modules
    run({ exec: makeExec(), exists, detach });
    expect(detach).toHaveBeenCalledWith('pnpm', ['install', '--frozen-lockfile', '--ignore-scripts'], WORKTREE);
  });

  it('détache npm ci si pnpm absent', () => {
    const detach = vi.fn();
    const exists = (p) => p === `${WORKTREE}/package.json`;
    run({ exec: makeExec(WORKTREE, MAIN, ''), exists, detach });
    expect(detach).toHaveBeenCalledWith('npm', ['ci', '--ignore-scripts'], WORKTREE);
  });

  it("n'utilise jamais exec pour lancer l'install (travail détaché, non bloquant)", () => {
    const calls = [];
    const exec = (cmd) => { calls.push(cmd); return makeExec()(cmd); };
    const exists = (p) => p === `${WORKTREE}/package.json`;
    run({ exec, exists, detach: vi.fn() });
    expect(calls.some((c) => c.includes('install') || c.includes(' ci'))).toBe(false);
  });
});
