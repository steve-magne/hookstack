// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/quality-check.mjs';

const PROJECT_DIR = '/fake/project';

function makeOpts({ hasPkg = true, hasTsConfig = true, hasEslintConfig = false, execResults = {} } = {}) {
  return {
    projectDir: PROJECT_DIR,
    exists: (p) => {
      if (p.endsWith('package.json')) return hasPkg;
      if (p.endsWith('tsconfig.json')) return hasTsConfig;
      if (p.endsWith('eslint.config.js')) return hasEslintConfig;
      return false;
    },
    exec: vi.fn((cmd) => {
      const key = Object.keys(execResults).find((k) => cmd.includes(k));
      if (key !== undefined) {
        if (execResults[key] instanceof Error) throw execResults[key];
        return execResults[key];
      }
    }),
  };
}

describe('quality-check', () => {
  it('retourne 0 checks si pas de package.json', () => {
    const result = run(makeOpts({ hasPkg: false }));
    expect(result.checks).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('inclut TypeScript seulement si tsconfig.json présent', () => {
    const opts = makeOpts({ hasTsConfig: true });
    run(opts);
    expect(opts.exec).toHaveBeenCalledWith(expect.stringContaining('tsc'));
  });

  it('n\'inclut pas TypeScript sans tsconfig.json', () => {
    const opts = makeOpts({ hasTsConfig: false });
    run(opts);
    expect(opts.exec).not.toHaveBeenCalledWith(expect.stringContaining('tsc'));
  });

  it('retourne failed=0 si tous les checks passent', () => {
    const result = run(makeOpts());
    expect(result.failed).toBe(0);
    expect(result.message).toContain('Tous les contrôles qualité passent');
  });

  it('n\'inclut pas ESLint si pas de fichier de config ESLint', () => {
    const opts = makeOpts({ hasEslintConfig: false });
    run(opts);
    expect(opts.exec).not.toHaveBeenCalledWith(expect.stringContaining('eslint'));
  });

  it('inclut ESLint si eslint.config.js existe', () => {
    const opts = makeOpts({ hasEslintConfig: true });
    run(opts);
    expect(opts.exec).toHaveBeenCalledWith(expect.stringContaining('eslint'));
  });

  it('ESLint utilise le cache pour accélérer les runs suivants', () => {
    const opts = makeOpts({ hasEslintConfig: true });
    run(opts);
    expect(opts.exec).toHaveBeenCalledWith(expect.stringContaining('--cache'));
  });

  it('ne lance plus les tests — couverts par run-tests.mjs au Stop', () => {
    const opts = makeOpts({ hasEslintConfig: true });
    run(opts);
    for (const call of opts.exec.mock.calls) {
      expect(call[0]).not.toMatch(/\b(pnpm|yarn|npm|bun) test|vitest/);
    }
  });

  it('retourne failed=1 quand TypeScript échoue', () => {
    const err = Object.assign(new Error('type error'), { stdout: Buffer.from('Type error in foo.ts') });
    const result = run(makeOpts({ execResults: { tsc: err } }));
    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(result.message).toContain('✗ TypeScript');
  });

  it('retourne failed>0 quand ESLint échoue', () => {
    const err = Object.assign(new Error('lint error'), { stdout: Buffer.from('2 errors') });
    const result = run(makeOpts({ hasEslintConfig: true, execResults: { eslint: err } }));
    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(result.message).toContain('✗ ESLint');
  });

  it('affiche le nombre de vérifications échouées dans le message', () => {
    const err = Object.assign(new Error('fail'), { stdout: Buffer.from('') });
    const result = run(makeOpts({ hasEslintConfig: true, execResults: { tsc: err, eslint: err } }));
    expect(result.message).toContain('vérification(s) échouée(s)');
  });
});
