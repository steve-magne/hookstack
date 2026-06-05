// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/subagent-start-tts.mjs';

describe('subagent-start-tts', () => {
  it('annonce le démarrage', () => {
    const exec = vi.fn();
    expect(run({ exec, platform: 'darwin' })).toBe('Sous-agent démarré');
  });
});
