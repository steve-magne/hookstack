// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/session-start-worktree-if-main.mjs';

const MAIN = '/repos/hookstack';
const DATE = '20260602';
const SUFFIX = 'abc123';
const BRANCH = `claude/session-${DATE}-${SUFFIX}`;
const WT_PATH = `${MAIN}/.claude/worktrees/session-${DATE}-${SUFFIX}`;

function makeExec({ branch = 'main', currentRoot = MAIN, worktreeList } = {}) {
  const defaultList = worktreeList ?? `${MAIN}  abc1234 [main]`;
  return vi.fn((cmd) => {
    if (cmd.includes('branch --show-current')) return branch;
    if (cmd.includes('rev-parse --show-toplevel')) return currentRoot;
    if (cmd.includes('git worktree list')) return defaultList;
    if (cmd.includes('fetch')) return '';
    if (cmd.includes('merge')) return '';
    return '';
  });
}

const fixedRandom = () => SUFFIX;
const fixedNow = () => new Date(`${DATE.slice(0, 4)}-${DATE.slice(4, 6)}-${DATE.slice(6, 8)}`);

describe('session-start-worktree-if-main', () => {
  it("ne fait rien si la branche courante n'est pas main", () => {
    const exec = makeExec({ branch: 'feature/foo' });
    expect(run({ exec, random: fixedRandom })).toBeNull();
  });

  it('ne fait rien si on est déjà dans un worktree secondaire', () => {
    const exec = makeExec({
      currentRoot: WT_PATH,
      worktreeList: `${MAIN}  abc [main]\n${WT_PATH}  def [${BRANCH}]`,
    });
    expect(run({ exec, random: fixedRandom })).toBeNull();
  });

  it('crée un worktree frais avec un nom unique par session', () => {
    const exec = makeExec();
    const addWorktree = vi.fn();
    const exists = vi.fn(() => true);
    const result = run({ exec, addWorktree, exists, now: fixedNow, random: fixedRandom });
    expect(addWorktree).toHaveBeenCalledWith(WT_PATH, BRANCH);
    expect(result).toContain('Worktree isolé créé automatiquement');
    expect(result).toContain(WT_PATH);
    expect(result).toContain(BRANCH);
  });

  it('crée toujours un nouveau worktree même si un worktree du même jour existe déjà', () => {
    // Un worktree d'une session précédente du même jour est présent — on ne le réutilise JAMAIS.
    const oldSuffix = 'fff000';
    const oldPath = `${MAIN}/.claude/worktrees/session-${DATE}-${oldSuffix}`;
    const oldBranch = `claude/session-${DATE}-${oldSuffix}`;
    const list = `${MAIN}  abc [main]\n${oldPath}  def [${oldBranch}]`;
    const exec = makeExec({ worktreeList: list });
    const addWorktree = vi.fn();
    const exists = vi.fn(() => true);
    const result = run({ exec, addWorktree, exists, now: fixedNow, random: fixedRandom });
    expect(addWorktree).toHaveBeenCalledWith(WT_PATH, BRANCH);
    expect(result).toContain('Worktree isolé créé automatiquement');
  });

  it('ne supprime jamais un worktree existant (préserve les sessions actives)', () => {
    const oldPath = `${MAIN}/.claude/worktrees/session-20260101-aaa111`;
    const oldBranch = 'claude/session-20260101-aaa111';
    const list = `${MAIN}  abc [main]\n${oldPath}  def [${oldBranch}]`;
    const exec = makeExec({ worktreeList: list });
    const addWorktree = vi.fn();
    const exists = vi.fn(() => true);
    run({ exec, addWorktree, exists, now: fixedNow, random: fixedRandom });
    const calls = exec.mock.calls.map((c) => c[0]);
    expect(calls.some((c) => c.includes('worktree remove'))).toBe(false);
    expect(calls.some((c) => c.includes('branch -D'))).toBe(false);
    expect(addWorktree).toHaveBeenCalledWith(WT_PATH, BRANCH);
  });

  it('synchronise main avec le remote avant de créer le worktree', () => {
    const calls = [];
    const exec = vi.fn((cmd) => {
      calls.push(cmd);
      if (cmd.includes('branch --show-current')) return 'main';
      if (cmd.includes('rev-parse --show-toplevel')) return MAIN;
      if (cmd.includes('git worktree list')) return `${MAIN}  abc [main]`;
      return '';
    });
    const addWorktree = vi.fn();
    const exists = vi.fn(() => true);
    run({ exec, addWorktree, exists, now: fixedNow, random: fixedRandom });
    const fetchIdx = calls.findIndex((c) => c.includes('fetch'));
    const mergeIdx = calls.findIndex((c) => c.includes('merge --ff-only'));
    expect(fetchIdx).toBeGreaterThanOrEqual(0);
    expect(mergeIdx).toBeGreaterThan(fetchIdx);
    expect(addWorktree).toHaveBeenCalled();
  });

  it('retourne un avertissement si addWorktree échoue', () => {
    const exec = makeExec();
    const addWorktree = vi.fn(() => { throw new Error('branch exists'); });
    const result = run({ exec, addWorktree, now: fixedNow, random: fixedRandom });
    expect(result).toContain('⚠️');
  });

  it("retourne null si le répertoire worktree n'existe pas après création", () => {
    const exec = makeExec();
    const addWorktree = vi.fn();
    const exists = vi.fn(() => false);
    const result = run({ exec, addWorktree, exists, now: fixedNow, random: fixedRandom });
    expect(result).toBeNull();
  });
});
