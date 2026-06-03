import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/block-push-closed-pr.mjs';

const makeInput = (command) => ({ tool_input: { command } });

describe('block-push-closed-pr', () => {
  it('laisse passer les commandes non-push', () => {
    expect(run(makeInput('git status'))).toBeNull();
    expect(run(makeInput('git commit -m "foo"'))).toBeNull();
  });

  it('ignore main et master', () => {
    const exec = vi.fn()
      .mockReturnValueOnce('main\n')
      .mockReturnValueOnce('master\n');
    expect(run(makeInput('git push'), { exec })).toBeNull();
    expect(run(makeInput('git push'), { exec })).toBeNull();
  });

  it('bloque si la PR est mergée', () => {
    const exec = vi.fn()
      .mockReturnValueOnce('fix/my-feature\n')
      .mockReturnValueOnce('MERGED\n');
    const result = run(makeInput('git push'), { exec });
    expect(result?.decision).toBe('block');
    expect(result?.reason).toMatch(/mergée/);
    expect(result?.reason).toMatch(/fix\/my-feature/);
  });

  it('bloque si la PR est fermée', () => {
    const exec = vi.fn()
      .mockReturnValueOnce('fix/closed-branch\n')
      .mockReturnValueOnce('CLOSED\n');
    const result = run(makeInput('git push'), { exec });
    expect(result?.decision).toBe('block');
    expect(result?.reason).toMatch(/fermée/);
  });

  it('laisse passer si la PR est ouverte', () => {
    const exec = vi.fn()
      .mockReturnValueOnce('fix/open-pr\n')
      .mockReturnValueOnce('OPEN\n');
    expect(run(makeInput('git push'), { exec })).toBeNull();
  });

  it('laisse passer si gh échoue (pas de PR)', () => {
    const exec = vi.fn()
      .mockReturnValueOnce('fix/no-pr\n')
      .mockImplementationOnce(() => { throw new Error('no PR'); });
    expect(run(makeInput('git push'), { exec })).toBeNull();
  });

  it('laisse passer si git rev-parse échoue', () => {
    const exec = vi.fn().mockImplementationOnce(() => { throw new Error(); });
    expect(run(makeInput('git push'), { exec })).toBeNull();
  });
});
