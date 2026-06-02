// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/block-destructive.mjs';

describe('block-destructive', () => {
  it('laisse passer une commande anodine', () => {
    expect(run({ tool_input: { command: 'ls -la' } })).toBeNull();
  });

  it('bloque rm -rf /', () => {
    const r = run({ tool_input: { command: 'rm -rf /' } });
    expect(r?.decision).toBe('block');
    expect(r?.reason).toContain('rm -rf /');
  });

  it('bloque force-push sur main', () => {
    const r = run({ tool_input: { command: 'git push --force origin main' } });
    expect(r?.decision).toBe('block');
  });

  it('bloque DROP TABLE', () => {
    expect(run({ tool_input: { command: 'DROP TABLE users' } })?.decision).toBe('block');
  });

  it('bloque chmod 777 récursif sur /', () => {
    expect(run({ tool_input: { command: 'chmod -R 777 /' } })?.decision).toBe('block');
  });

  it('laisse passer si tool_input absent', () => {
    expect(run({})).toBeNull();
  });
});
