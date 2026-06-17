// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run, resolveActivateBundle } from '../../.claude/hooks/notification-sound.mjs';

describe('resolveActivateBundle', () => {
  it('retourne le bundle iTerm2 si TERM_PROGRAM=iTerm.app', () => {
    expect(resolveActivateBundle('iTerm.app')).toBe('com.googlecode.iterm2');
  });

  it('retourne le bundle Terminal.app si TERM_PROGRAM=Apple_Terminal', () => {
    expect(resolveActivateBundle('Apple_Terminal')).toBe('com.apple.Terminal');
  });

  it('retourne le bundle VSCode si TERM_PROGRAM=vscode', () => {
    expect(resolveActivateBundle('vscode')).toBe('com.microsoft.VSCode');
  });

  it('retourne Claude app si TERM_PROGRAM est absent (app desktop)', () => {
    expect(resolveActivateBundle(undefined)).toBe('com.anthropic.claudefordesktop');
  });

  it('retourne Claude app si TERM_PROGRAM est inconnu', () => {
    expect(resolveActivateBundle('some-unknown-terminal')).toBe('com.anthropic.claudefordesktop');
  });
});

describe('notification-sound', () => {
  it('utilise terminal-notifier avec le bon bundleId si disponible (iTerm2)', () => {
    const exec = vi.fn();
    run({}, { exec, hasTerminalNotifier: () => true, platform: 'darwin', termProgram: 'iTerm.app' });
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('terminal-notifier'));
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('com.googlecode.iterm2'));
  });

  it('utilise terminal-notifier avec Claude app si pas de TERM_PROGRAM', () => {
    const exec = vi.fn();
    run({}, { exec, hasTerminalNotifier: () => true, platform: 'darwin', termProgram: undefined });
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('com.anthropic.claudefordesktop'));
  });

  it('bascule sur afplay + osascript si terminal-notifier absent', () => {
    const exec = vi.fn();
    run({}, { exec, hasTerminalNotifier: () => false, platform: 'darwin' });
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('Glass.aiff'));
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('display notification'));
  });

  it('joue paplay sur Linux', () => {
    const exec = vi.fn();
    run({}, { exec, platform: 'linux' });
    expect(exec).toHaveBeenCalled();
  });

  it('joue un beep PowerShell sur Windows', () => {
    const exec = vi.fn();
    run({}, { exec, platform: 'win32' });
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('powershell'));
  });

  it('retourne null (non bloquant)', () => {
    const exec = vi.fn();
    expect(run({}, { exec, hasTerminalNotifier: () => true, platform: 'darwin' })).toBeNull();
  });

  it("ne leve pas d'erreur si exec echoue", () => {
    const exec = vi.fn(() => { throw new Error('commande absente'); });
    expect(() => run({}, { exec, hasTerminalNotifier: () => true, platform: 'darwin' })).not.toThrow();
  });

  it('ne joue rien sur plateforme inconnue', () => {
    const exec = vi.fn();
    run({}, { exec, platform: 'freebsd' });
    expect(exec).not.toHaveBeenCalled();
  });
});
