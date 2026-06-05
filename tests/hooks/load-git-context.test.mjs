// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/load-git-context.mjs';

describe('load-git-context', () => {
  it('compose le contexte git', () => {
    const exec = (cmd) => {
      if (cmd.includes('show-current')) return 'main';
      if (cmd.includes('log')) return 'abc123 fix';
      if (cmd.includes('status')) return ' M file.ts';
      return '';
    };
    const out = run({ exec });
    expect(out).toContain('Branche : `main`');
    expect(out).toContain('abc123 fix');
    expect(out).toContain('Fichiers modifiés');
  });
  it('indique répertoire propre sans statut', () => {
    const exec = (cmd) => (cmd.includes('show-current') ? 'main' : '');
    expect(run({ exec })).toContain('propre');
  });
  it("retourne null hors d'un repo git", () => {
    expect(run({ exec: () => '' })).toBeNull();
  });
});
