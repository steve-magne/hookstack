// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/config-audit-log.mjs';

const TS = '2026-06-02T00:00:00.000Z';
const base = () => ({ append: vi.fn(), mkdir: vi.fn(), now: () => TS, projectDir: '/proj', home: '/home' });

describe('config-audit-log', () => {
  it('journalise un changement de config', () => {
    const deps = base();
    const { entry, message } = run({ change: { theme: 'dark' } }, deps);
    expect(entry).toMatchObject({ ts: TS, project: 'proj', change: { theme: 'dark' } });
    expect(message).toContain('config-audit');
    expect(deps.append).toHaveBeenCalled();
  });
});
