// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from './missing-test-detection.mjs';

const COUNTER = '/tmp/.test-counter';
const DISABLE = '/tmp/.test-disable';

function makeOpts(overrides = {}) {
  return {
    counterFile: COUNTER,
    disableFile: DISABLE,
    exists: () => false,
    readFile: () => '0',
    writeFile: vi.fn(),
    unlink: vi.fn(),
    exec: () => '',
    ...overrides,
  };
}

describe('missing-test-detection', () => {
  it('retourne exitCode 0 si le fichier disable existe', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const result = run(makeOpts({ exists: (p) => p === DISABLE }));
    expect(result.exitCode).toBe(0);
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('SUSPENDU'));
    stderrSpy.mockRestore();
  });

  it('retourne exitCode 0 si aucun fichier modifié', () => {
    const opts = makeOpts({ exec: () => '' });
    const result = run(opts);
    expect(result.exitCode).toBe(0);
  });

  it('ignore les fichiers hors src/lib|store|hooks', () => {
    const exec = (cmd) => {
      if (cmd.includes('merge-base')) return 'abc';
      if (cmd.includes('rev-parse')) return 'def';
      if (cmd.includes('diff')) return 'src/components/Button.tsx\nsrc/types/hook.ts';
      return '';
    };
    const result = run(makeOpts({ exec }));
    expect(result.exitCode).toBe(0);
  });

  it('retourne exitCode 0 si les tests existent', () => {
    const exec = (cmd) => {
      if (cmd.includes('merge-base')) return 'abc';
      if (cmd.includes('rev-parse')) return 'def';
      if (cmd.includes('diff')) return 'src/lib/hooks.ts';
      if (cmd.includes('find')) return 'src/lib/hooks.test.ts';
      return '';
    };
    const result = run(makeOpts({ exec }));
    expect(result.exitCode).toBe(0);
  });

  it('retourne exitCode 2 si un test est manquant', () => {
    const exec = (cmd) => {
      if (cmd.includes('merge-base')) return 'abc';
      if (cmd.includes('rev-parse')) return 'def';
      if (cmd.includes('diff')) return 'src/lib/mymodule.ts';
      return '';
    };
    const result = run(makeOpts({ exec }));
    expect(result.exitCode).toBe(2);
    expect(result.message).toContain('src/lib/mymodule.ts');
  });

  it('incrémente le compteur à chaque échec', () => {
    const writeFile = vi.fn();
    const exec = (cmd) => {
      if (cmd.includes('merge-base')) return 'abc';
      if (cmd.includes('rev-parse')) return 'def';
      if (cmd.includes('diff')) return 'src/lib/missing.ts';
      return '';
    };
    run(makeOpts({ exec, readFile: () => '1', writeFile }));
    expect(writeFile).toHaveBeenCalledWith(COUNTER, '2');
  });

  it('auto-désactive après 3 échecs', () => {
    const writeFile = vi.fn();
    const exec = (cmd) => {
      if (cmd.includes('merge-base')) return 'abc';
      if (cmd.includes('rev-parse')) return 'def';
      if (cmd.includes('diff')) return 'src/store/store.ts';
      return '';
    };
    const result = run(makeOpts({ exec, readFile: () => '2', writeFile }));
    expect(result.exitCode).toBe(2);
    expect(result.message).toContain('AUTO-DISABLE');
    expect(writeFile).toHaveBeenCalledWith(DISABLE, '');
  });

  it('réinitialise le compteur si pas de fichiers manquants', () => {
    const unlink = vi.fn();
    const exec = (cmd) => {
      if (cmd.includes('diff')) return 'src/lib/ok.ts';
      if (cmd.includes('find')) return 'src/lib/ok.test.ts';
      return '';
    };
    run(makeOpts({ exec, unlink }));
    expect(unlink).toHaveBeenCalledWith(COUNTER);
  });

  it('utilise git diff HEAD si pas de base merge', () => {
    const exec = vi.fn((cmd) => {
      if (cmd.includes('merge-base')) return '';
      if (cmd.includes('rev-parse')) return '';
      return '';
    });
    run(makeOpts({ exec }));
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('diff --name-only HEAD'));
  });
});
