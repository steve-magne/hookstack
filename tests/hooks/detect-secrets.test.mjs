// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/detect-secrets.mjs';
import { SECRETS } from './_utils.mjs';

// Les commandes sont construites par concaténation pour que le fichier source
// ne contienne aucun motif littéral (ex. "API_KEY=<val>") susceptible de
// déclencher le hook pre-write-secret-detection sur ce dépôt.
const cmd = (parts) => ({ tool_input: { command: parts.join('') } });

describe('detect-secrets', () => {
  it('bloque une clé API Anthropic', () => {
    expect(run(cmd(['export ANTHROPIC_API_KEY=', SECRETS.anthropicKey]))?.decision).toBe('block');
  });

  it('bloque un token GitHub', () => {
    expect(run(cmd(['echo ', SECRETS.githubToken]))?.decision).toBe('block');
  });

  it('bloque une clé privée', () => {
    expect(run(cmd(['echo "', SECRETS.privateKey, '"']))?.decision).toBe('block');
  });

  it('bloque un password=...', () => {
    expect(run(cmd(['curl -d "', SECRETS.passwordLine, '"']))?.decision).toBe('block');
  });

  it('laisse passer une commande anodine', () => {
    expect(run({ tool_input: { command: 'ls -la' } })).toBeNull();
  });

  it('laisse passer si tool_input absent', () => {
    expect(run({})).toBeNull();
  });
});
