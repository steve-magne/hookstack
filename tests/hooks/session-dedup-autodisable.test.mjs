// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/session-dedup-autodisable.mjs';

describe('session-dedup-autodisable', () => {
  it('signale les hooks à désactiver', () => {
    const deps = { exists: () => true, readdir: () => ['a.counter'], readFile: () => '3', counterDir: '/c' };
    expect(run(deps).toDisable).toEqual(['a']);
  });
  it('retourne null sous le seuil', () => {
    const deps = { exists: () => true, readdir: () => ['a.counter'], readFile: () => '1', counterDir: '/c' };
    expect(run(deps)).toBeNull();
  });
  it('retourne null si pas de dossier', () => {
    expect(run({ exists: () => false, counterDir: '/c' })).toBeNull();
  });
});
