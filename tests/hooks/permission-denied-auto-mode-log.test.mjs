// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/permission-denied-auto-mode-log.mjs';

const TS = '2026-06-02T00:00:00.000Z';
const base = () => ({ append: vi.fn(), mkdir: vi.fn(), now: () => TS, projectDir: '/proj', home: '/home' });

describe('permission-denied-auto-mode-log', () => {
  it('construit une ligne avec outil et raison', () => {
    const deps = base();
    const line = run({ tool_name: 'Bash', tool_input: { command: 'rm' }, reason: 'denied' }, deps);
    expect(line).toContain('Bash');
    expect(line).toContain('denied');
    expect(deps.append).toHaveBeenCalledWith('/proj/.claude/permission-denied.log', line);
  });
});
