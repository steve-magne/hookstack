// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/audit-log.mjs';

const TS = '2026-06-02T00:00:00.000Z';
const base = () => ({ append: vi.fn(), mkdir: vi.fn(), now: () => TS, projectDir: '/proj', home: '/home' });

describe('audit-log', () => {
  it('construit et append une entrée de session', () => {
    const deps = base();
    const e = run({ session_id: 's1', total_cost_usd: 0.5, num_turns: 3 }, deps);
    expect(e).toMatchObject({ timestamp: TS, project: 'proj', session_id: 's1', total_cost_usd: 0.5, num_turns: 3 });
    expect(deps.append).toHaveBeenCalledWith('/home/.claude/audit-log.jsonl', JSON.stringify(e) + '\n');
  });
});
