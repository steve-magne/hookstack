// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { detect, run } from '../../.claude/hooks/run-tests.mjs';

const PROJECT_DIR = '/fake/project';

const MAIN_ROOT = '/fake/main';

function makeOpts({
  scripts = { test: 'vitest' },
  hasPkg = true,
  hasPnpmLock = false,
  hasYarnLock = false,
  hasBunLockb = false,
  hasBunLock = false,
  hasPyproject = false,
  hasGoMod = false,
  hasNodeModules = true,
  spawnStatus = 0,
} = {}) {
  return {
    projectDir: PROJECT_DIR,
    mainRoot: MAIN_ROOT,
    exists: (p) => {
      if (p.endsWith('node_modules')) return hasNodeModules;
      if (p.endsWith('package.json')) return hasPkg;
      if (p.endsWith('pnpm-lock.yaml')) return hasPnpmLock;
      if (p.endsWith('yarn.lock')) return hasYarnLock;
      if (p.endsWith('bun.lockb')) return hasBunLockb;
      if (p.endsWith('bun.lock')) return hasBunLock;
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
  it('retourne pnpm si pnpm-lock.yaml existe', () => {
    const opts = makeOpts({ hasPnpmLock: true });
    const result = detect({ exists: opts.exists, readFile: opts.readFile, projectDir: PROJECT_DIR });
    expect(result).toEqual(['pnpm', ['test', '--', '--run']]);
  });

  it('retourne npm si aucun lockfile spécifique', () => {
    const opts = makeOpts();
    const result = detect({ exists: opts.exists, readFile: opts.readFile, projectDir: PROJECT_DIR });
    expect(result).toEqual(['npm', ['test', '--', '--run']]);
  });

  it('retourne yarn si yarn.lock existe', () => {
    const opts = makeOpts({ hasYarnLock: true });
    const result = detect({ exists: opts.exists, readFile: opts.readFile, projectDir: PROJECT_DIR });
    expect(result).toEqual(['yarn', ['test', '--', '--run']]);
  });

  it('retourne bun si bun.lockb existe (bun <1.2)', () => {
    const opts = makeOpts({ hasBunLockb: true });
    const result = detect({ exists: opts.exists, readFile: opts.readFile, projectDir: PROJECT_DIR });
    expect(result).toEqual(['bun', ['test']]);
  });

  it('retourne bun si bun.lock existe (bun ≥1.2)', () => {
    const opts = makeOpts({ hasBunLock: true });
    const result = detect({ exists: opts.exists, readFile: opts.readFile, projectDir: PROJECT_DIR });
    expect(result).toEqual(['bun', ['test']]);
  });

  it('pnpm est prioritaire sur yarn si les deux lockfiles existent', () => {
    const opts = makeOpts({ hasPnpmLock: true, hasYarnLock: true });
    const result = detect({ exists: opts.exists, readFile: opts.readFile, projectDir: PROJECT_DIR });
    expect(result).toEqual(['pnpm', ['test', '--', '--run']]);
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
    expect(result).toEqual(['uv', ['run', 'pytest', '--tb=short', '-q']]);
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

  it('utilise mainRoot si node_modules absent dans projectDir (worktree)', () => {
    const spawnCalls = [];
    const opts = {
      ...makeOpts({ hasNodeModules: false }),
      spawn: (cmd, args, spawnOpts) => {
        spawnCalls.push(spawnOpts.cwd);
        return { status: 0, stdout: 'ok', stderr: '' };
      },
    };
    run(opts);
    expect(spawnCalls[0]).toBe(MAIN_ROOT);
  });

  it('utilise projectDir si node_modules présent', () => {
    const spawnCalls = [];
    const opts = {
      ...makeOpts({ hasNodeModules: true }),
      spawn: (cmd, args, spawnOpts) => {
        spawnCalls.push(spawnOpts.cwd);
        return { status: 0, stdout: 'ok', stderr: '' };
      },
    };
    run(opts);
    expect(spawnCalls[0]).toBe(PROJECT_DIR);
  });
});
