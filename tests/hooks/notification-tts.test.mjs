// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/notification-tts.mjs';

describe('notification-tts', () => {
  it('vocalise un message via say sur darwin', () => {
    const exec = vi.fn();
    const text = run({ message: '# Hello' }, { exec, platform: 'darwin' });
    expect(text).toBe(' Hello');
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('say "'));
  });
  it('retourne null sans message', () => {
    expect(run({}, { exec: vi.fn(), platform: 'darwin' })).toBeNull();
  });
  it('utilise espeak hors darwin', () => {
    const exec = vi.fn();
    run({ message: 'hi' }, { exec, platform: 'linux' });
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('espeak'));
  });
});
