// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/notify-slack.mjs';

describe('notify-slack', () => {
  it('retourne null sans webhook', () => {
    expect(run({ message: 'x' }, { exec: vi.fn(), webhook: '' })).toBeNull();
  });
  it('retourne null sans message', () => {
    expect(run({}, { exec: vi.fn(), webhook: 'https://hook' })).toBeNull();
  });
  it('poste le payload via curl', () => {
    const exec = vi.fn();
    const payload = run({ message: 'hi' }, { exec, webhook: 'https://hook', projectDir: '/x/proj' });
    expect(payload).toContain('proj');
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('curl'));
  });
});
