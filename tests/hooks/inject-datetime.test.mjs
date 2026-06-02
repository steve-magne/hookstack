// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/inject-datetime.mjs';

describe('inject-datetime', () => {
  it('retourne une ligne de date formatée', () => {
    const out = run({ now: new Date('2026-06-02T12:00:00Z') });
    expect(out).toContain('Date et heure courantes :');
    expect(out.endsWith('\n')).toBe(true);
  });

  it('fonctionne sans argument', () => {
    expect(run()).toContain('Date et heure courantes :');
  });
});
