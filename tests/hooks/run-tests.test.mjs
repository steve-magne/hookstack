// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { detect, run } from '../../.claude/hooks/run-tests.mjs';

const PROJECT_DIR = '/fake/project';

function makeOpts({ scripts = { test: 'vitest' }, hasPkg = true, hasPyproject = false, hasGoMod = false, spawnStatus = 0 } = {}) {
  return {
    projectDir: PROJECT_DIR,
    exists: (p) => {
      if (p.endsWith('package.json')) return hasPkg;
      if (p.endsWith('pyproject.toml')) return hasPyproject;
      if (p.endsWith('go.mod')) return hasGoMod;
      return false;
    },
    readFile: () => JSON.stringify({ scripts }),
    spawn: () => ({
      status: spawnStatus,
      stdout: 'Test output',
      stderr: spawnStatus !== 0 ? 'Error details' : '',
    }),
  };
}

describe('detect', () => {
  it('retourne pnpm test si scripts.test existe', () => {
    const opts = makeOpts();
    const result = detect({ exists: opts.exists, readFile: opts.readFile, projectDir: PROJECT_DIR });
    expect(result).toEqual(['pnpm', ['test', '--run']]);
  });

  it('retourne null si pas de package.json ni pytest ni go.mod', () => {
    const result = detect({
      exists: () => false,
      readFile: () => '{}',
      projectDir: PROJECT_DIR,
    });
    expect(result).toBeNull();
  });

  it('retourne pytest si pyproject.toml existe', () => {
    const result = detect({
      exists: (p) => p.endsWith('pyproject.toml'),
      readFile: () => '{}',
      projectDir: PROJECT_DIR,
    });
    expect(result).toEqual(['python', ['-m', 'pytest', '--tb=short', '-q']]);
  });

  it('retourne go test si go.mod existe', () => {
    const result = detect({
      exists: (p) => p.endsWith('go.mod'),
      readFile: () => '{}',
      projectDir: PROJECT_DIR,
    });
    expect(result).toEqual(['go', ['test', './...']]);
  });
});

describe('run', () => {
  it('retourne null si aucun runner détecté', () => {
    const result = run(makeOpts({ hasPkg: false }));
    expect(result).toBeNull();
  });

  it('retourne status 0 et message succès quand les tests passent', () => {
    const result = run(makeOpts({ spawnStatus: 0 }));
    expect(result.status).toBe(0);
    expect(result.message).toContain('✓ Tests passés');
  });

  it('retourne status non-0 et message échec quand les tests échouent', () => {
    const result = run(makeOpts({ spawnStatus: 1 }));
    expect(result.status).toBe(1);
    expect(result.message).toContain('ÉCHEC');
  });

  it('inclut la sortie du processus dans le message en cas d\'échec', () => {
    const result = run(makeOpts({ spawnStatus: 1 }));
    expect(result.message).toContain('Error details');
  });
});
