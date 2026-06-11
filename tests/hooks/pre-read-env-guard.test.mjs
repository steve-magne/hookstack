// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/pre-read-env-guard.mjs';

describe('pre-read-env-guard', () => {
  it('laisse passer si tool_name != Read', () => {
    expect(run({ tool_name: 'Write', tool_input: { file_path: '/app/.env' } })).toBeNull();
  });

  it('laisse passer si tool_input absent', () => {
    expect(run({ tool_name: 'Read' })).toBeNull();
  });

  it('laisse passer un fichier normal', () => {
    expect(run({ tool_name: 'Read', tool_input: { file_path: 'src/env.ts' } })).toBeNull();
  });

  it("laisse passer un fichier dont le nom contient env sans être un .env", () => {
    expect(run({ tool_name: 'Read', tool_input: { file_path: 'config/environment.ts' } })).toBeNull();
  });

  it('bloque .env', () => {
    const r = run({ tool_name: 'Read', tool_input: { file_path: '/app/.env' } });
    expect(r?.decision).toBe('block');
    expect(r?.reason).toContain('.env.example');
  });

  it('bloque .env.local', () => {
    expect(run({ tool_name: 'Read', tool_input: { file_path: '.env.local' } })?.decision).toBe('block');
  });

  it('bloque .env.production', () => {
    expect(run({ tool_name: 'Read', tool_input: { file_path: 'apps/web/.env.production' } })?.decision).toBe('block');
  });

  it('laisse passer .env.example', () => {
    expect(run({ tool_name: 'Read', tool_input: { file_path: '/app/.env.example' } })).toBeNull();
  });

  it('laisse passer .env.sample et .env.template', () => {
    expect(run({ tool_name: 'Read', tool_input: { file_path: '.env.sample' } })).toBeNull();
    expect(run({ tool_name: 'Read', tool_input: { file_path: '.env.template' } })).toBeNull();
  });

  it('laisse passer .env.local.example (suffixe sûr en dernier)', () => {
    expect(run({ tool_name: 'Read', tool_input: { file_path: '.env.local.example' } })).toBeNull();
  });
});
