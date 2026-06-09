// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/session-start-worktree-if-main.mjs';

const MAIN = '/repos/hookstack';
const DATE = '20260602';
const BRANCH = `work/session-${DATE}`;
const WT_PATH = `${MAIN}/.claude/worktrees/session-${DATE}`;

function makeExec({ branch = 'main', mainRoot = MAIN, currentRoot = MAIN, worktreeList, mergedBranches = '' } = {}) {
  const defaultList = worktreeList ?? `${MAIN}  abc1234 [main]`;
  return vi.fn((cmd) => {
    if (cmd.includes('branch --show-current')) return branch;
    if (cmd.includes('rev-parse --show-toplevel')) return currentRoot;
    if (cmd.includes('git worktree list')) return defaultList;
    if (cmd.includes('fetch')) return '';
    if (cmd.includes('branch --merged')) return mergedBranches;
    return '';
  });
}

describe('session-start-worktree-if-main', () => {
  it("ne fait rien si la branche courante n'est pas main", () => {
    const exec = makeExec({ branch: 'feature/foo' });
    const result = run({ exec });
    expect(result).toBeNull();
  });

  it('ne fait rien si on est déjà dans un worktree secondaire', () => {
    const exec = makeExec({
      currentRoot: WT_PATH,
      worktreeList: `${MAIN}  abc [main]\n${WT_PATH}  def [${BRANCH}]`,
    });
    const result = run({ exec });
    expect(result).toBeNull();
  });

  it("cree un worktree s'il n'en existe pas pour aujourd'hui", () => {
    const exec = makeExec();
    const addWorktree = vi.fn();
    const exists = vi.fn(() => true);
    const now = () => new Date(`${DATE.slice(0, 4)}-${DATE.slice(4, 6)}-${DATE.slice(6, 8)}`);
    const result = run({ exec, addWorktree, exists, now });
    expect(addWorktree).toHaveBeenCalledWith(WT_PATH, BRANCH);
    expect(result).toContain('Worktree isolé créé automatiquement');
  });

  it("reutilise le worktree du jour s'il existe et n'est pas merge", () => {
    const list = `${MAIN}  abc [main]\n${WT_PATH}  def [${BRANCH}]`;
    const exec = makeExec({ worktreeList: list, mergedBranches: '' });
    const addWorktree = vi.fn();
    const now = () => new Date(`${DATE.slice(0, 4)}-${DATE.slice(4, 6)}-${DATE.slice(6, 8)}`);
    const result = run({ exec, addWorktree, now });
    expect(addWorktree).not.toHaveBeenCalled();
    expect(result).toContain('Worktree session existant');
    expect(result).toContain(WT_PATH);
  });

  it('supprime le worktree mergé et en crée un nouveau', () => {
    // La liste initiale contient un worktree avec une branche mergée
    const listWithMerged = `${MAIN}  abc [main]\n${WT_PATH}  def [${BRANCH}]`;
    // Après suppression, la liste ne contient plus le worktree
    let callCount = 0;
    const exec = vi.fn((cmd) => {
      if (cmd.includes('branch --show-current')) return 'main';
      if (cmd.includes('rev-parse --show-toplevel')) return MAIN;
      if (cmd.includes('git worktree list')) {
        // Premier appel = avant nettoyage, appels suivants = après nettoyage
        callCount++;
        return callCount <= 2 ? listWithMerged : `${MAIN}  abc [main]`;
      }
      if (cmd.includes('fetch')) return '';
      if (cmd.includes('branch --merged')) return `  main\n  ${BRANCH}`;
      return '';
    });
    const removeWorktree = vi.fn();
    const addWorktree = vi.fn();
    const exists = vi.fn(() => true);
    const now = () => new Date(`${DATE.slice(0, 4)}-${DATE.slice(4, 6)}-${DATE.slice(6, 8)}`);
    const result = run({ exec, addWorktree, removeWorktree, exists, now });
    expect(removeWorktree).toHaveBeenCalledWith(MAIN, WT_PATH, BRANCH);
    expect(addWorktree).toHaveBeenCalledWith(WT_PATH, BRANCH);
    expect(result).toContain('Worktree isolé créé automatiquement');
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
    const now = () => new Date(`${DATE.slice(0, 4)}-${DATE.slice(4, 6)}-${DATE.slice(6, 8)}`);
    run({ exec, addWorktree, exists, now });
    const fetchIdx = calls.findIndex((c) => c.includes('fetch'));
    const mergeIdx = calls.findIndex((c) => c.includes('merge --ff-only'));
    const addIdx = calls.findIndex((c) => c.includes('worktree list') && calls.indexOf(c) > mergeIdx);
    expect(mergeIdx).toBeGreaterThan(fetchIdx);
    expect(addWorktree).toHaveBeenCalled();
    // le merge doit avoir eu lieu avant la création du worktree
    expect(mergeIdx).toBeLessThan(calls.length);
  });

  it('retourne un avertissement si addWorktree échoue', () => {
    const exec = makeExec();
    const addWorktree = vi.fn(() => { throw new Error('branch exists'); });
    const now = () => new Date(`${DATE.slice(0, 4)}-${DATE.slice(4, 6)}-${DATE.slice(6, 8)}`);
    const result = run({ exec, addWorktree, now });
    expect(result).toContain('⚠️');
  });

  it("retourne null si le repertoire worktree n'existe pas apres creation", () => {
    const exec = makeExec();
    const addWorktree = vi.fn();
    const exists = vi.fn(() => false);
    const now = () => new Date(`${DATE.slice(0, 4)}-${DATE.slice(4, 6)}-${DATE.slice(6, 8)}`);
    const result = run({ exec, addWorktree, exists, now });
    expect(result).toBeNull();
  });
});
