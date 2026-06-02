// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/detect-secrets.mjs';

describe('detect-secrets', () => {
  it('bloque une clé API Anthropic', () => {
    expect(run({ tool_input: { command: 'export ANTHROPIC_API_KEY=sk-ant-abcdefghijklmnopqrstuvwxyz123456' } })?.decision).toBe('block');
  });

  it('bloque un token GitHub', () => {
    expect(run({ tool_input: { command: 'echo ghp_0123456789abcdefghijklmnopqrstuvwxyz0123' } })?.decision).toBe('block');
  });

  it('bloque une clé privée', () => {
    expect(run({ tool_input: { command: 'echo "-----BEGIN RSA PRIVATE KEY-----"' } })?.decision).toBe('block');
  });

  it('bloque un password=...', () => {
    expect(run({ tool_input: { command: 'curl -d "password=\'hunter2\'"' } })?.decision).toBe('block');
  });

  it('laisse passer une commande anodine', () => {
    expect(run({ tool_input: { command: 'ls -la' } })).toBeNull();
  });

  it('laisse passer si tool_input absent', () => {
    expect(run({})).toBeNull();
  });
});
