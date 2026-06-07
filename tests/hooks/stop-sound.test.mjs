// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/stop-sound.mjs';

describe('stop-sound', () => {
  it('joue Hero.aiff sur macOS', () => {
    const exec = vi.fn();
    run({ exec, platform: 'darwin' });
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('Hero.aiff'));
  });

  it('affiche une notification macOS à la fin', () => {
    const exec = vi.fn();
    run({ exec, platform: 'darwin' });
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('display notification'));
  });

  it('joue paplay sur Linux', () => {
    const exec = vi.fn();
    run({ exec, platform: 'linux' });
    expect(exec).toHaveBeenCalled();
  });

  it('joue un beep PowerShell sur Windows', () => {
    const exec = vi.fn();
    run({ exec, platform: 'win32' });
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('powershell'));
  });

  it('retourne null (non bloquant)', () => {
    const exec = vi.fn();
    expect(run({ exec, platform: 'darwin' })).toBeNull();
  });

  it("ne leve pas d'erreur si exec echoue", () => {
    const exec = vi.fn(() => { throw new Error('afplay absent'); });
    expect(() => run({ exec, platform: 'darwin' })).not.toThrow();
  });

  it('ne joue rien sur plateforme inconnue', () => {
    const exec = vi.fn();
    run({ exec, platform: 'freebsd' });
    expect(exec).not.toHaveBeenCalled();
  });
});
