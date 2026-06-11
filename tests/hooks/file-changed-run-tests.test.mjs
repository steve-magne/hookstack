// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run, detectManager } from '../../.claude/hooks/file-changed-run-tests.mjs';
import { makeExecFail } from './_utils.mjs';
const PROJECT_DIR = '/fake/project';

function makeDeps({ hasVitest = true, lockfile = 'pnpm-lock.yaml', exec = () => Buffer.from('ok') } = {}) {
  return {
    projectDir: PROJECT_DIR,
    exec: vi.fn(exec),
    exists: (p) =>
      (hasVitest && p.endsWith('/node_modules/.bin/vitest')) || p.endsWith(`/${lockfile}`),
  };
}

describe('file-changed-run-tests', () => {
  it('ignore un événement unlink', () => {
    expect(run({ event: 'unlink' }, makeDeps())).toBeNull();
  });

  it('utilise vitest related sur le fichier modifié si vitest est présent', () => {
    const deps = makeDeps();
    run({ file_path: '/fake/project/src/a.ts' }, deps);
    expect(deps.exec).toHaveBeenCalledWith(expect.stringContaining('vitest related --run "/fake/project/src/a.ts"'));
  });

  it('replie sur le gestionnaire détecté (pnpm) sans vitest', () => {
    const deps = makeDeps({ hasVitest: false });
    run({ file_path: 'src/a.ts' }, deps);
    expect(deps.exec).toHaveBeenCalledWith(expect.stringContaining('pnpm test --if-present'));
  });

  it('rapporte un succès', () => {
    const r = run({ file_path: 'a.ts' }, makeDeps());
    expect(r?.hookSpecificOutput?.additionalContext).toContain('passed');
  });

  it('rapporte un échec', () => {
    const r = run({ file_path: 'a.ts' }, makeDeps({ exec: makeExecFail('test failed') }));
    expect(r?.hookSpecificOutput?.additionalContext).toContain('FAILED');
  });
});

describe('detectManager', () => {
  const mk = (lockfile) => ({ projectDir: '/p', exists: (p) => p.endsWith(`/${lockfile}`) });
  it('détecte pnpm', () => expect(detectManager(mk('pnpm-lock.yaml'))).toBe('pnpm'));
  it('détecte bun', () => expect(detectManager(mk('bun.lock'))).toBe('bun'));
  it('détecte yarn', () => expect(detectManager(mk('yarn.lock'))).toBe('yarn'));
  it('replie sur npm', () => expect(detectManager(mk('nope'))).toBe('npm'));
});
