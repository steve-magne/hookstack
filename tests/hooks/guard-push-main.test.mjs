// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/guard-push-main.mjs';

describe('guard-push-main', () => {
  it('bloque git push --force origin main', () => {
    expect(run({ tool_input: { command: 'git push --force origin main' } })?.decision).toBe('block');
  });

  it('bloque git push -f vers master', () => {
    expect(run({ tool_input: { command: 'git push -f origin master' } })?.decision).toBe('block');
  });

  it('laisse passer un push normal sur main', () => {
    expect(run({ tool_input: { command: 'git push origin main' } })).toBeNull();
  });

  it('laisse passer un force-push sur une branche de feature', () => {
    expect(run({ tool_input: { command: 'git push --force origin feat/x' } })).toBeNull();
  });

  it('laisse passer si tool_input absent', () => {
    expect(run({})).toBeNull();
  });
});
