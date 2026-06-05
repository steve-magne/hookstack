// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/stop-failure-rate-limit-alert.mjs';

describe('stop-failure-rate-limit-alert', () => {
  it('retourne une séquence terminale', () => {
    expect(run().terminalSequence).toContain('rate limit');
  });
});
