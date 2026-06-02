// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/webfetch-allowlist.mjs';

const noFile = { exists: () => false };

describe('webfetch-allowlist', () => {
  it('laisse passer un domaine par défaut', () => {
    expect(run({ tool_input: { url: 'https://github.com/x' } }, noFile)).toBeNull();
  });

  it('laisse passer un sous-domaine autorisé', () => {
    expect(run({ tool_input: { url: 'https://raw.githubusercontent.com/a/b' } }, noFile)).toBeNull();
  });

  it('bloque un domaine non autorisé', () => {
    const r = run({ tool_input: { url: 'https://evil.example.com' } }, noFile);
    expect(r?.decision).toBe('block');
    expect(r?.reason).toContain('evil.example.com');
  });

  it('respecte une allowlist personnalisée', () => {
    const deps = { exists: () => true, readFile: () => JSON.stringify(['my.dev']) };
    expect(run({ tool_input: { url: 'https://my.dev/x' } }, deps)).toBeNull();
    expect(run({ tool_input: { url: 'https://github.com/x' } }, deps)?.decision).toBe('block');
  });

  it('laisse passer si url absente', () => {
    expect(run({ tool_input: {} }, noFile)).toBeNull();
  });

  it('laisse passer une url invalide', () => {
    expect(run({ tool_input: { url: 'pas-une-url' } }, noFile)).toBeNull();
  });
});
