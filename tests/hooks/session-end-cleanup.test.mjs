// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/session-end-cleanup.mjs';

describe('session-end-cleanup', () => {
  it('supprime les fichiers claude- périmés', () => {
    const unlink = vi.fn();
    const deps = {
      readdir: () => ['claude-old', 'other'],
      stat: () => ({ mtimeMs: 0 }),
      unlink,
      tmp: '/tmp',
      maxAge: 1000,
      now: () => 10_000_000,
    };
    expect(run(deps).cleaned).toBe(1);
    expect(unlink).toHaveBeenCalledWith('/tmp/claude-old');
  });
  it('ne supprime rien si récent', () => {
    const deps = { readdir: () => ['claude-new'], stat: () => ({ mtimeMs: 9_999_999 }), unlink: vi.fn(), now: () => 10_000_000, maxAge: 1000 };
    expect(run(deps).cleaned).toBe(0);
  });
});
