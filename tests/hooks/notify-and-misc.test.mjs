// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run as notificationTts } from '../../.claude/hooks/notification-tts.mjs';
import { run as stopTts } from '../../.claude/hooks/stop-tts.mjs';
import { run as subagentStartTts } from '../../.claude/hooks/subagent-start-tts.mjs';
import { run as subagentStopTts } from '../../.claude/hooks/subagent-stop-tts.mjs';
import { run as notifySlack } from '../../.claude/hooks/notify-slack.mjs';
import { run as rateLimitAlert } from '../../.claude/hooks/stop-failure-rate-limit-alert.mjs';
import { run as redactSecrets } from '../../.claude/hooks/message-display-redact-secrets.mjs';
import { run as loadGitContext } from '../../.claude/hooks/load-git-context.mjs';

describe('notification-tts', () => {
  it('vocalise un message via say sur darwin', () => {
    const exec = vi.fn();
    const text = notificationTts({ message: '# Hello' }, { exec, platform: 'darwin' });
    expect(text).toBe(' Hello');
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('say "'));
  });
  it('retourne null sans message', () => {
    expect(notificationTts({}, { exec: vi.fn(), platform: 'darwin' })).toBeNull();
  });
  it('utilise espeak hors darwin', () => {
    const exec = vi.fn();
    notificationTts({ message: 'hi' }, { exec, platform: 'linux' });
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('espeak'));
  });
});

describe('stop-tts', () => {
  it('annonce le projet', () => {
    const exec = vi.fn();
    expect(stopTts({ exec, platform: 'darwin', projectDir: '/x/myproj' })).toContain('myproj');
    expect(exec).toHaveBeenCalled();
  });
});

describe('subagent-start-tts', () => {
  it('annonce le démarrage', () => {
    const exec = vi.fn();
    expect(subagentStartTts({ exec, platform: 'darwin' })).toBe('Sous-agent démarré');
  });
});

describe('subagent-stop-tts', () => {
  it('inclut le résumé', () => {
    const exec = vi.fn();
    expect(subagentStopTts({ summary: 'fini' }, { exec, platform: 'darwin' })).toContain('fini');
  });
  it('texte par défaut sans résumé', () => {
    expect(subagentStopTts({}, { exec: vi.fn(), platform: 'darwin' })).toBe('Sous-agent terminé');
  });
});

describe('notify-slack', () => {
  it('retourne null sans webhook', () => {
    expect(notifySlack({ message: 'x' }, { exec: vi.fn(), webhook: '' })).toBeNull();
  });
  it('retourne null sans message', () => {
    expect(notifySlack({}, { exec: vi.fn(), webhook: 'https://hook' })).toBeNull();
  });
  it('poste le payload via curl', () => {
    const exec = vi.fn();
    const payload = notifySlack({ message: 'hi' }, { exec, webhook: 'https://hook', projectDir: '/x/proj' });
    expect(payload).toContain('proj');
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('curl'));
  });
});

describe('stop-failure-rate-limit-alert', () => {
  it('retourne une séquence terminale', () => {
    expect(rateLimitAlert().terminalSequence).toContain('rate limit');
  });
});

describe('message-display-redact-secrets', () => {
  it('caviarde une clé Anthropic', () => {
    const r = redactSecrets({ delta: 'key sk-ant-api03-abcdefghijklmnopqrstuvwxyz' });
    expect(r?.hookSpecificOutput?.displayContent).toContain('[REDACTED-ANTHROPIC-KEY]');
  });
  it('caviarde un Bearer token', () => {
    const r = redactSecrets({ delta: 'Authorization: Bearer abcdefghijklmnopqrstuvwxyz123' });
    expect(r?.hookSpecificOutput?.displayContent).toContain('Bearer [REDACTED]');
  });
  it('retourne null si rien à caviarder', () => {
    expect(redactSecrets({ delta: 'texte normal' })).toBeNull();
  });
});

describe('load-git-context', () => {
  it('compose le contexte git', () => {
    const exec = (cmd) => {
      if (cmd.includes('show-current')) return 'main';
      if (cmd.includes('log')) return 'abc123 fix';
      if (cmd.includes('status')) return ' M file.ts';
      return '';
    };
    const out = loadGitContext({ exec });
    expect(out).toContain('Branche : `main`');
    expect(out).toContain('abc123 fix');
    expect(out).toContain('Fichiers modifiés');
  });
  it('indique répertoire propre sans statut', () => {
    const exec = (cmd) => (cmd.includes('show-current') ? 'main' : '');
    expect(loadGitContext({ exec })).toContain('propre');
  });
  it('retourne null hors d\'un repo git', () => {
    expect(loadGitContext({ exec: () => '' })).toBeNull();
  });
});
