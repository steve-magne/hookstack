// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/user-prompt-log.mjs';

const TS = '2026-06-02T00:00:00.000Z';
const base = () => ({ append: vi.fn(), mkdir: vi.fn(), now: () => TS, projectDir: '/proj', home: '/home' });

describe('user-prompt-log', () => {
  it('crée une nouvelle session avec le prompt', () => {
    const deps = { ...base(), exists: () => false, writeFile: vi.fn() };
    const data = run({ session_id: 's1', prompt: 'hello' }, deps);
    expect(data.prompts).toHaveLength(1);
    expect(data.prompts[0]).toMatchObject({ prompt: 'hello', timestamp: TS });
    expect(deps.writeFile).toHaveBeenCalled();
  });
  it('append au tableau existant', () => {
    const deps = {
      ...base(),
      exists: () => true,
      readFile: () => JSON.stringify({ session_id: 's1', prompts: [{ prompt: 'a' }] }),
      writeFile: vi.fn(),
    };
    const data = run({ session_id: 's1', prompt: 'b' }, deps);
    expect(data.prompts).toHaveLength(2);
  });
});
