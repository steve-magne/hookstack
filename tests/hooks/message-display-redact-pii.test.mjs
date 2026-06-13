// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/message-display-redact-pii.mjs';

describe('message-display-redact-pii', () => {
  it('caviarde un numéro de carte Visa', () => {
    const r = run({ delta: 'Card: 4111 1111 1111 1111 expiry 12/26' });
    expect(r?.hookSpecificOutput?.displayContent).toContain('[REDACTED-CARD]');
    expect(r?.hookSpecificOutput?.displayContent).not.toContain('4111');
  });

  it('caviarde un numéro de carte avec tirets', () => {
    const r = run({ delta: 'Payment: 5500-0000-0000-0004' });
    expect(r?.hookSpecificOutput?.displayContent).toContain('[REDACTED-CARD]');
  });

  it('caviarde un IBAN français', () => {
    const r = run({ delta: 'IBAN: FR76 3000 6000 0112 3456 7890 189' });
    expect(r?.hookSpecificOutput?.displayContent).toContain('[REDACTED-IBAN]');
  });

  it('caviarde un SSN américain', () => {
    const r = run({ delta: 'SSN: 123-45-6789 — do not share' });
    expect(r?.hookSpecificOutput?.displayContent).toContain('[REDACTED-SSN]');
  });

  it('caviarde une adresse e-mail client', () => {
    const r = run({ delta: 'User john.doe@example.com signed up' });
    expect(r?.hookSpecificOutput?.displayContent).toContain('[REDACTED-EMAIL]');
    expect(r?.hookSpecificOutput?.displayContent).not.toContain('john.doe');
  });

  it('caviarde plusieurs PII dans un même delta', () => {
    const r = run({ delta: 'Card 4111111111111111 email foo@bar.com' });
    const content = r?.hookSpecificOutput?.displayContent ?? '';
    expect(content).toContain('[REDACTED-CARD]');
    expect(content).toContain('[REDACTED-EMAIL]');
  });

  it('retourne null si aucune PII détectée', () => {
    expect(run({ delta: 'SELECT count(*) FROM orders WHERE status = \'pending\'' })).toBeNull();
  });

  it('retourne null si delta vide', () => {
    expect(run({ delta: '' })).toBeNull();
    expect(run({})).toBeNull();
  });
});
