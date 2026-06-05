// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/stop-failure-log-api-errors.mjs';

const TS = '2026-06-02T00:00:00.000Z';
const base = () => ({ append: vi.fn(), mkdir: vi.fn(), now: () => TS, projectDir: '/proj', home: '/home' });

describe('stop-failure-log-api-errors', () => {
  it("construit une ligne d'erreur API", () => {
    const line = run({ error: 'rate_limit', error_details: '429', session_id: 's1' }, base());
    expect(line).toContain('rate_limit');
    expect(line).toContain('session:s1');
  });
});
