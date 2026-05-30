// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from './per-file-coverage.mjs';

const COUNTER = '/tmp/.test-cov-counter';
const DISABLE = '/tmp/.test-cov-disable';
const COV_JSON = '/tmp/test-coverage.json';
const CWD = '/repos/hookit';

function makeCoverage(files = {}) {
  return JSON.stringify(files);
}

function makeOpts(overrides = {}) {
  return {
    counterFile: COUNTER,
    disableFile: DISABLE,
    covJson: COV_JSON,
    cwd: CWD,
    exists: (p) => p === COV_JSON,
    readFile: vi.fn(() => '0'),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    exec: () => '',
    ...overrides,
  };
}

describe('per-file-coverage', () => {
  it('retourne exitCode 0 si le fichier disable existe', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const result = run(makeOpts({ exists: (p) => p === DISABLE }));
    expect(result.exitCode).toBe(0);
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('SUSPENDU'));
    stderrSpy.mockRestore();
  });

  it('retourne exitCode 0 si coverage-summary.json absent', () => {
    const result = run(makeOpts({ exists: () => false }));
    expect(result.exitCode).toBe(0);
  });

  it('retourne exitCode 0 si JSON invalide', () => {
    const result = run(makeOpts({ readFile: () => 'invalid json' }));
    expect(result.exitCode).toBe(0);
  });

  it('retourne exitCode 0 si aucun fichier modifié', () => {
    const result = run(makeOpts({ exec: () => '', readFile: () => '{}' }));
    expect(result.exitCode).toBe(0);
  });

  it('ignore les fichiers non-.ts/.tsx', () => {
    const exec = (cmd) => cmd.includes('diff') ? 'README.md\nsrc/lib/utils.css' : '';
    const result = run(makeOpts({ exec, readFile: () => '{}' }));
    expect(result.exitCode).toBe(0);
  });

  it('ignore src/types, src/constants, src/router, src/main', () => {
    const exec = (cmd) => cmd.includes('diff')
      ? 'src/types/hook.ts\nsrc/constants/index.ts\nsrc/router/index.tsx\nsrc/main.tsx'
      : '';
    const result = run(makeOpts({ exec, readFile: () => '{}' }));
    expect(result.exitCode).toBe(0);
  });

  it('retourne exitCode 0 si coverage ≥ 80%', () => {
    const file = 'src/lib/hooks.ts';
    const cov = makeCoverage({ [`${CWD}/${file}`]: { lines: { pct: 85 } } });
    const exec = (cmd) => {
      if (cmd.includes('merge-base')) return 'abc';
      if (cmd.includes('rev-parse')) return 'def';
      if (cmd.includes('diff')) return file;
      return '';
    };
    const result = run(makeOpts({ exec, readFile: () => cov }));
    expect(result.exitCode).toBe(0);
  });

  it('retourne exitCode 2 si coverage < 80%', () => {
    const file = 'src/lib/hooks.ts';
    const cov = makeCoverage({ [`${CWD}/${file}`]: { lines: { pct: 60 } } });
    const exec = (cmd) => {
      if (cmd.includes('merge-base')) return 'abc';
      if (cmd.includes('rev-parse')) return 'def';
      if (cmd.includes('diff')) return file;
      return '';
    };
    const result = run(makeOpts({ exec, readFile: () => cov }));
    expect(result.exitCode).toBe(2);
    expect(result.message).toContain('60%');
    expect(result.message).toContain(file);
  });

  it('incrémente le compteur à chaque échec', () => {
    const file = 'src/lib/hooks.ts';
    const cov = makeCoverage({ [`${CWD}/${file}`]: { lines: { pct: 10 } } });
    const writeFile = vi.fn();
    const exec = (cmd) => cmd.includes('diff') ? file : 'abc';
    run(makeOpts({ exec, readFile: (p) => p === COV_JSON ? cov : '1', writeFile }));
    expect(writeFile).toHaveBeenCalledWith(COUNTER, '2');
  });

  it('auto-désactive après 3 échecs', () => {
    const file = 'src/lib/hooks.ts';
    const cov = makeCoverage({ [`${CWD}/${file}`]: { lines: { pct: 10 } } });
    const writeFile = vi.fn();
    const exec = (cmd) => cmd.includes('diff') ? file : 'abc';
    const result = run(makeOpts({ exec, readFile: (p) => p === COV_JSON ? cov : '2', writeFile }));
    expect(result.message).toContain('AUTO-DISABLE');
    expect(writeFile).toHaveBeenCalledWith(DISABLE, '');
  });

  it('réinitialise le compteur si coverage OK', () => {
    const file = 'src/lib/hooks.ts';
    const cov = makeCoverage({ [`${CWD}/${file}`]: { lines: { pct: 95 } } });
    const unlink = vi.fn();
    const exec = (cmd) => cmd.includes('diff') ? file : 'abc';
    run(makeOpts({ exec, readFile: () => cov, unlink }));
    expect(unlink).toHaveBeenCalledWith(COUNTER);
  });

  it('ignore les fichiers absents du rapport de coverage', () => {
    const exec = (cmd) => cmd.includes('diff') ? 'src/lib/untracked.ts' : 'abc';
    const result = run(makeOpts({ exec, readFile: () => '{}' }));
    expect(result.exitCode).toBe(0);
  });
});
