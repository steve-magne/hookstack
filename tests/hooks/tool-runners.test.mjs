// @vitest-environment node
// Tests groupés des hooks runners d'outils (filtrer -> exec -> marshaller l'échec).
import { describe, it, expect, vi } from 'vitest';
import { run as autoformat } from '../../.claude/hooks/autoformat.mjs';
import { run as eslintCheck } from '../../.claude/hooks/eslint-check.mjs';
import { run as typecheck } from '../../.claude/hooks/typecheck.mjs';
import { run as postBatchTypecheck } from '../../.claude/hooks/post-tool-batch-typecheck.mjs';
import { run as fileChangedRunTests } from '../../.claude/hooks/file-changed-run-tests.mjs';
import { run as qualityCheck } from '../../.claude/hooks/quality-check.mjs';
import { run as i18nValidation } from '../../.claude/hooks/i18n-validation.mjs';
import { run as runTests, detect } from '../../.claude/hooks/run-tests.mjs';

// Simule une commande qui échoue avec une sortie stdout.
const fail = (stdout) => () => { const e = new Error('cmd failed'); e.stdout = Buffer.from(stdout); throw e; };

describe('autoformat', () => {
  it('formate un fichier', () => {
    const exec = vi.fn();
    expect(autoformat({ tool_input: { file_path: 'a.ts' } }, { exec })?.formatted).toBe('a.ts');
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('prettier --write "a.ts"'));
  });
  it('ignore l\'absence de fichier', () => {
    expect(autoformat({ tool_input: {} }, { exec: vi.fn() })).toBeNull();
  });
  it('avale une erreur prettier', () => {
    expect(autoformat({ tool_input: { file_path: 'a.ts' } }, { exec: fail('') })).toBeNull();
  });
});

describe('eslint-check', () => {
  it('ignore les fichiers non-JS/TS', () => {
    expect(eslintCheck({ tool_input: { file_path: 'a.css' } }, { exec: vi.fn() })).toBeNull();
  });
  it('retourne null si eslint passe', () => {
    expect(eslintCheck({ tool_input: { file_path: 'a.ts' } }, { exec: vi.fn() })).toBeNull();
  });
  it('remonte les erreurs eslint', () => {
    const r = eslintCheck({ tool_input: { file_path: 'a.ts' } }, { exec: fail('1:1 error') });
    expect(r?.message).toContain('ESLint');
    expect(r?.message).toContain('1:1 error');
  });
});

describe('typecheck', () => {
  it('ignore les fichiers non-TS', () => {
    expect(typecheck({ tool_input: { file_path: 'a.js' } }, { exec: vi.fn(), projectDir: '/p' })).toBeNull();
  });
  it('remonte les erreurs tsc', () => {
    const r = typecheck({ tool_input: { file_path: 'a.ts' } }, { exec: fail('TS2322'), projectDir: '/p' });
    expect(r?.message).toContain('TypeScript');
  });
});

describe('post-tool-batch-typecheck', () => {
  it('ignore un batch sans .ts', () => {
    expect(postBatchTypecheck({ tool_calls: [{ tool_name: 'Read', tool_input: {} }] }, { exec: vi.fn() })).toBeNull();
  });
  it('injecte les erreurs tsc en contexte', () => {
    const input = { tool_calls: [{ tool_name: 'Edit', tool_input: { file_path: 'a.ts' } }] };
    const r = postBatchTypecheck(input, { exec: fail('TS errors') });
    expect(r?.hookSpecificOutput?.additionalContext).toContain('TypeScript errors');
  });
});

describe('file-changed-run-tests', () => {
  it('ignore un événement unlink', () => {
    expect(fileChangedRunTests({ event: 'unlink' }, { exec: vi.fn() })).toBeNull();
  });
  it('rapporte un succès', () => {
    const r = fileChangedRunTests({ file_path: 'a.ts' }, { exec: () => Buffer.from('ok') });
    expect(r?.hookSpecificOutput?.additionalContext).toContain('passed');
  });
  it('rapporte un échec', () => {
    const r = fileChangedRunTests({ file_path: 'a.ts' }, { exec: fail('test failed') });
    expect(r?.hookSpecificOutput?.additionalContext).toContain('FAILED');
  });
});

describe('quality-check', () => {
  it('signale tous les contrôles OK', () => {
    const r = qualityCheck({ exec: vi.fn(), exists: () => true, projectDir: '/p' });
    expect(r.failed).toBe(0);
    expect(r.checks).toBe(3);
    expect(r.message).toContain('Tous les contrôles');
  });
  it('compte les échecs', () => {
    const r = qualityCheck({ exec: fail('boom'), exists: () => true, projectDir: '/p' });
    expect(r.failed).toBeGreaterThan(0);
  });
  it('ne lance rien sans package.json', () => {
    const r = qualityCheck({ exec: vi.fn(), exists: () => false, projectDir: '/p' });
    expect(r.checks).toBe(0);
  });
});

describe('i18n-validation', () => {
  it('retourne null si moins de 2 fichiers i18n', () => {
    expect(i18nValidation({ exec: () => './locales/fr.json', projectDir: '/p' })).toBeNull();
  });
  it('détecte des clés manquantes', () => {
    const exec = () => './locales/fr.json\n./locales/en.json';
    const readFile = (p) => (p.includes('fr.json') ? '{"a":1,"b":2}' : '{"a":1}');
    const r = i18nValidation({ exec, readFile, projectDir: '/p' });
    expect(r.issues.length).toBeGreaterThan(0);
    expect(r.message).toContain('manque');
  });
  it('signale la cohérence', () => {
    const exec = () => './locales/fr.json\n./locales/en.json';
    const readFile = () => '{"a":1}';
    const r = i18nValidation({ exec, readFile, projectDir: '/p' });
    expect(r.issues).toHaveLength(0);
  });
});

describe('run-tests', () => {
  it('detecte pnpm test depuis package.json', () => {
    const deps = { exists: (p) => p.endsWith('package.json'), readFile: () => '{"scripts":{"test":"vitest"}}', projectDir: '/p' };
    expect(detect(deps)).toEqual(['pnpm', ['test', '--run']]);
  });
  it('detecte pytest', () => {
    const deps = { exists: (p) => p.endsWith('pyproject.toml'), readFile: () => '{}', projectDir: '/p' };
    expect(detect(deps)[0]).toBe('python');
  });
  it('retourne null si aucun runner', () => {
    expect(runTests({ exists: () => false, readFile: () => '{}', spawn: vi.fn(), projectDir: '/p' })).toBeNull();
  });
  it('rapporte un succès de tests', () => {
    const spawn = () => ({ status: 0, stdout: 'all good\n', stderr: '' });
    const deps = { exists: (p) => p.endsWith('package.json'), readFile: () => '{"scripts":{"test":"x"}}', spawn, projectDir: '/p' };
    const r = runTests(deps);
    expect(r.status).toBe(0);
    expect(r.message).toContain('Tests passés');
  });
  it('rapporte un échec de tests', () => {
    const spawn = () => ({ status: 1, stdout: 'fail', stderr: '' });
    const deps = { exists: (p) => p.endsWith('package.json'), readFile: () => '{"scripts":{"test":"x"}}', spawn, projectDir: '/p' };
    expect(runTests(deps).message).toContain('ÉCHEC');
  });
});
