// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/worktree-remove-cleanup.mjs';

describe('worktree-remove-cleanup', () => {
  it('retourne null sans worktree_path', () => {
    expect(run({}, { exec: vi.fn(), exists: () => true, rm: vi.fn() })).toBeNull();
  });

  it('lance docker compose down si compose présent', () => {
    const exec = vi.fn();
    const r = run({ worktree_path: '/wt' }, { exec, exists: (p) => p.includes('docker-compose.yml'), rm: vi.fn() });
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('docker compose'));
    expect(r.actions).toContain('docker-down');
  });

  it('supprime node_modules si présent', () => {
    const rm = vi.fn();
    const r = run({ worktree_path: '/wt' }, { exec: vi.fn(), exists: (p) => p.endsWith('node_modules'), rm });
    expect(rm).toHaveBeenCalledWith('/wt/node_modules', { recursive: true, force: true });
    expect(r.actions).toContain('rm-node-modules');
  });

  it('ne fait rien si rien à nettoyer', () => {
    const r = run({ worktree_path: '/wt' }, { exec: vi.fn(), exists: () => false, rm: vi.fn() });
    expect(r.actions).toHaveLength(0);
  });
});
