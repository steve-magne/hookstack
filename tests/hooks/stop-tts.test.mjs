// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/stop-tts.mjs';

describe('stop-tts', () => {
  it('annonce le projet', () => {
    const exec = vi.fn();
    expect(run({ exec, platform: 'darwin', projectDir: '/x/myproj' })).toContain('myproj');
    expect(exec).toHaveBeenCalled();
  });
});
