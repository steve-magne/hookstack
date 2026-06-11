// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/session-start-github-context.mjs';

describe('session-start-github-context', () => {
  it('reste silencieux si gh ne retourne rien (absent ou non authentifié)', () => {
    expect(run({}, { exec: vi.fn(() => '') })).toBeNull();
  });

  it('injecte les PRs ouvertes', () => {
    const exec = vi.fn((cmd) => (cmd.includes('pr list') ? '42\tFix the thing\topen' : ''));
    const r = run({}, { exec });
    const ctx = r?.hookSpecificOutput?.additionalContext ?? '';
    expect(r?.hookSpecificOutput?.hookEventName).toBe('SessionStart');
    expect(ctx).toContain('Open PRs');
    expect(ctx).toContain('Fix the thing');
    expect(ctx).not.toContain('Checks on current branch');
  });

  it('injecte les checks de la PR courante', () => {
    const exec = vi.fn((cmd) => (cmd.includes('pr checks') ? 'build\tpass\t1m2s' : ''));
    const ctx = run({}, { exec })?.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx).toContain('Checks on current branch');
    expect(ctx).toContain('build');
  });

  it('combine PRs et checks quand les deux existent', () => {
    const exec = vi.fn((cmd) => {
      if (cmd.includes('pr list')) return '7\tAdd feature\topen';
      if (cmd.includes('pr checks')) return 'ci\tfail\t30s';
      return '';
    });
    const ctx = run({}, { exec })?.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx).toContain('Add feature');
    expect(ctx).toContain('ci');
  });
});
