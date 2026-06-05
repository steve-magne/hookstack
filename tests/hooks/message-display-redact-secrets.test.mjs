// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/message-display-redact-secrets.mjs';

describe('message-display-redact-secrets', () => {
  it('caviarde une clé Anthropic', () => {
    const r = run({ delta: 'key sk-ant-api03-abcdefghijklmnopqrstuvwxyz' });
    expect(r?.hookSpecificOutput?.displayContent).toContain('[REDACTED-ANTHROPIC-KEY]');
  });
  it('caviarde un Bearer token', () => {
    const r = run({ delta: 'Authorization: Bearer abcdefghijklmnopqrstuvwxyz123' });
    expect(r?.hookSpecificOutput?.displayContent).toContain('Bearer [REDACTED]');
  });
  it('retourne null si rien à caviarder', () => {
    expect(run({ delta: 'texte normal' })).toBeNull();
  });
});
