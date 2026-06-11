// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/stop-duplication-check.mjs';

const noClones = () => 'Analysis complete. 0 clones found.';
const withClones = () => 'Found 3 clones in 4 files.\nClone at src/a.ts:10-20';
const failWith = (out) => () => { const e = new Error('exit 1'); e.stdout = out; throw e; };

const deps = (exec, dirs = ['src']) => ({ exec, exists: (d) => dirs.includes(d) });

describe('stop-duplication-check', () => {
  it('retourne null si aucun répertoire source trouvé', () => {
    expect(run({}, { exec: vi.fn(), exists: () => false })).toBeNull();
  });

  it('retourne null si jscpd est absent (exec lève sans stdout)', () => {
    const exec = () => { throw new Error('jscpd: command not found'); };
    expect(run({}, deps(exec))).toBeNull();
  });

  it('retourne null si jscpd passe sans clone', () => {
    expect(run({}, deps(noClones))).toBeNull();
  });

  it('retourne un message si des clones sont détectés (exit 0 avec stdout)', () => {
    const r = run({}, deps(withClones));
    expect(r?.message).toContain('[duplication-check]');
    expect(r?.message).toContain('Found 3 clones');
  });

  it('retourne un message si jscpd exit 1 avec stdout de clones', () => {
    const r = run({}, deps(failWith('Found 1 clone in 2 files.')));
    expect(r?.message).toContain('[duplication-check]');
    expect(r?.message).toContain('Found 1 clone');
  });

  it('retourne null si jscpd exit 1 sans stdout utile', () => {
    expect(run({}, deps(failWith('')))).toBeNull();
  });

  it('passe les répertoires existants à jscpd', () => {
    const exec = vi.fn(noClones);
    run({}, deps(exec, ['src', 'tests']));
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('src tests'));
  });
});
