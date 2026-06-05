// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/post-tool-failure-log.mjs';

const TS = '2026-06-02T00:00:00.000Z';
const base = () => ({ append: vi.fn(), mkdir: vi.fn(), now: () => TS, projectDir: '/proj', home: '/home' });

describe('post-tool-failure-log', () => {
  it("journalise un échec d'outil", () => {
    const deps = base();
    const { entry } = run({ tool_name: 'Bash', tool_input: { command: 'x' }, error: 'boom' }, deps);
    expect(entry).toMatchObject({ ts: TS, tool: 'Bash', error: 'boom' });
    expect(deps.append).toHaveBeenCalled();
  });
});
