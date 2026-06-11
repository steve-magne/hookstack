// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/stop-registry-drift-check.mjs';
import { makeExecFail } from './_utils.mjs';

describe('stop-registry-drift-check', () => {
  it('no-op si le projet n\'a pas de sync-hooks.mjs', () => {
    const exec = vi.fn();
    expect(run({ exec, exists: () => false, projectDir: '/p' })).toBeNull();
    expect(exec).not.toHaveBeenCalled();
  });

  it('silencieux quand le registre est synchrone', () => {
    expect(run({ exec: vi.fn(() => '✓ synchrone'), exists: () => true, projectDir: '/p' })).toBeNull();
  });

  it('bloque le Stop (exit 2) en cas de dérive, avec instruction de resync', () => {
    const r = run({ exec: makeExecFail('✗ dérive : my-hook'), exists: () => true, projectDir: '/p' });
    expect(r?.exitCode).toBe(2);
    expect(r?.message).toContain('my-hook');
    expect(r?.message).toContain('sync-hooks.mjs');
  });
});
