// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/subagent-stop-tts.mjs';

describe('subagent-stop-tts', () => {
  it('inclut le résumé', () => {
    const exec = vi.fn();
    expect(run({ summary: 'fini' }, { exec, platform: 'darwin' })).toContain('fini');
  });
  it('texte par défaut sans résumé', () => {
    expect(run({}, { exec: vi.fn(), platform: 'darwin' })).toBe('Sous-agent terminé');
  });
});
