// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/worktree-ghostty.mjs';

describe('worktree-ghostty', () => {
  it('ouvre Ghostty sur macOS lors d\'un WorktreeCreate', () => {
    const exec = vi.fn();
    run({ worktree_path: '/work/hookstack-work-abc', branch: 'work/session-abc' }, { exec, platform: 'darwin' });
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('/work/hookstack-work-abc'));
  });

  it('ne fait rien sur WorktreeRemove (pas de branch)', () => {
    const exec = vi.fn();
    run({ worktree_path: '/work/hookstack-work-abc' }, { exec, platform: 'darwin' });
    expect(exec).not.toHaveBeenCalled();
  });

  it('ne fait rien sur plateforme non-macOS', () => {
    const exec = vi.fn();
    run({ worktree_path: '/work/hookstack-work-abc', branch: 'work/session-abc' }, { exec, platform: 'linux' });
    expect(exec).not.toHaveBeenCalled();
  });

  it('retourne null (non bloquant)', () => {
    const exec = vi.fn();
    expect(run({ worktree_path: '/work/foo', branch: 'work/foo' }, { exec, platform: 'darwin' })).toBeNull();
  });

  it('ne lève pas d\'erreur si Ghostty est absent', () => {
    const exec = vi.fn(() => { throw new Error('ghostty: command not found'); });
    expect(() =>
      run({ worktree_path: '/work/foo', branch: 'work/foo' }, { exec, platform: 'darwin' }),
    ).not.toThrow();
  });

  it('retourne null si worktree_path absent', () => {
    const exec = vi.fn();
    expect(run({}, { exec, platform: 'darwin' })).toBeNull();
    expect(exec).not.toHaveBeenCalled();
  });
});
