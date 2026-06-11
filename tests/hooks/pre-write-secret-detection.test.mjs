// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/pre-write-secret-detection.mjs';

// Fixtures construites par concaténation : le fichier de test lui-même
// ne doit pas contenir de motif de secret littéral (le hook tourne sur ce repo).
const fakeAnthropicKey = 'sk-' + 'ant-' + 'a'.repeat(40);
const fakeGithubToken = 'ghp_' + 'A1b2C3d4'.repeat(4) + 'A1b2';
const fakePasswordLine = 'pass' + 'word = "hunter2-super"';
const fakePrivateKey = '-----BEGIN RSA PRIVATE' + ' KEY-----';

describe('pre-write-secret-detection', () => {
  it('laisse passer si tool_input absent', () => {
    expect(run({ tool_name: 'Write' })).toBeNull();
  });

  it('laisse passer un contenu sain (Write)', () => {
    expect(run({ tool_name: 'Write', tool_input: { file_path: 'src/a.ts', content: 'const x = 1;' } })).toBeNull();
  });

  it('laisse passer un new_string sain (Edit)', () => {
    expect(run({ tool_name: 'Edit', tool_input: { file_path: 'src/a.ts', new_string: 'return null;' } })).toBeNull();
  });

  it('bloque une clé API style Anthropic dans content', () => {
    const r = run({ tool_name: 'Write', tool_input: { file_path: 'config.ts', content: `const k = "${fakeAnthropicKey}";` } });
    expect(r?.decision).toBe('block');
    expect(r?.reason).toContain('environment variable');
  });

  it('bloque un token GitHub dans new_string', () => {
    const r = run({ tool_name: 'Edit', tool_input: { file_path: 'ci.yml', new_string: `token: ${fakeGithubToken}` } });
    expect(r?.decision).toBe('block');
  });

  it('bloque une affectation de mot de passe', () => {
    expect(run({ tool_name: 'Write', tool_input: { file_path: 'db.py', content: fakePasswordLine } })?.decision).toBe('block');
  });

  it('bloque une clé privée PEM', () => {
    expect(run({ tool_name: 'Write', tool_input: { file_path: 'key.pem', content: fakePrivateKey } })?.decision).toBe('block');
  });

  it('ne bloque pas un placeholder court', () => {
    expect(run({ tool_name: 'Write', tool_input: { file_path: '.env.example', content: 'API_KEY=xxx' } })).toBeNull();
  });
});
