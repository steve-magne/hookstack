// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/bash-command-log.mjs';

const TS = '2026-06-02T00:00:00.000Z';
const base = () => ({ append: vi.fn(), mkdir: vi.fn(), now: () => TS, projectDir: '/proj', home: '/home' });

describe('bash-command-log', () => {
  it('journalise une commande', () => {
    const deps = { ...base(), cwd: '/proj' };
    const e = run({ tool_input: { command: 'ls' }, tool_response: { exit_code: 0 } }, deps);
    expect(e).toMatchObject({ ts: TS, cmd: 'ls', exit: 0, cwd: '/proj' });
    expect(deps.append).toHaveBeenCalled();
  });
  it('ignore une commande vide', () => {
    const deps = base();
    expect(run({ tool_input: {} }, deps)).toBeNull();
    expect(deps.append).not.toHaveBeenCalled();
  });
  it('tronque les commandes longues à 1000 car.', () => {
    const e = run({ tool_input: { command: 'x'.repeat(2000) } }, base());
    expect(e.cmd.length).toBe(1000);
  });
});
