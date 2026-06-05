// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/tool-usage.mjs';

const TS = '2026-06-02T00:00:00.000Z';
const base = () => ({ append: vi.fn(), mkdir: vi.fn(), now: () => TS, projectDir: '/proj', home: '/home' });

describe('tool-usage', () => {
  it('journalise une commande (tronquée à 500)', () => {
    const e = run({ tool_input: { command: 'y'.repeat(800) } }, base());
    expect(e.cmd.length).toBe(500);
  });
  it('ignore une commande vide', () => {
    expect(run({ tool_input: {} }, base())).toBeNull();
  });
});
