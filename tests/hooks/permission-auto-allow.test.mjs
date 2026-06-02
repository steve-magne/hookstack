// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/permission-auto-allow.mjs';

const allowed = (r) => r?.hookSpecificOutput?.decision?.behavior === 'allow';

describe('permission-auto-allow', () => {
  it('autorise les outils lecture seule', () => {
    expect(allowed(run({ tool_name: 'Read' }))).toBe(true);
    expect(allowed(run({ tool_name: 'Glob' }))).toBe(true);
    expect(allowed(run({ tool_name: 'Grep' }))).toBe(true);
  });

  it('autorise une commande Bash sûre', () => {
    expect(allowed(run({ tool_name: 'Bash', tool_input: { command: 'git status' } }))).toBe(true);
    expect(allowed(run({ tool_name: 'Bash', tool_input: { command: 'ls -la' } }))).toBe(true);
  });

  it('n\'autorise pas une commande Bash non listée', () => {
    expect(run({ tool_name: 'Bash', tool_input: { command: 'rm file' } })).toBeNull();
  });

  it('n\'autorise pas un cat avec redirection', () => {
    expect(run({ tool_name: 'Bash', tool_input: { command: 'cat x > y' } })).toBeNull();
  });

  it('n\'autorise pas Write', () => {
    expect(run({ tool_name: 'Write' })).toBeNull();
  });
});
