// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/guard-force-push-any.mjs';

const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });

describe('guard-force-push-any', () => {
  it('bloque git push --force sur une branche feature', () => {
    expect(run(bash('git push --force origin feature/x'))?.decision).toBe('block');
  });

  it('bloque git push -f', () => {
    expect(run(bash('git push -f origin dev'))?.decision).toBe('block');
  });

  it('laisse passer --force-with-lease', () => {
    expect(run(bash('git push --force-with-lease origin feature/x'))).toBeNull();
  });

  it('laisse passer un push normal', () => {
    expect(run(bash('git push origin main'))).toBeNull();
  });

  it("ne se déclenche pas hors d'un git push", () => {
    expect(run(bash('rm -f build.log'))).toBeNull();
  });

  it('ignore --force dans une chaîne entre guillemets', () => {
    expect(run(bash('git commit -m "use git push --force carefully"'))).toBeNull();
  });

  it('ignore les outils non-Bash', () => {
    expect(run({ tool_name: 'Edit', tool_input: { command: 'git push -f' } })).toBeNull();
  });
});
