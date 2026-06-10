// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/pytest.mjs';

const CWD = '/fake/project';

function makeOpts({ marker = 'pyproject.toml', spawnStatus = 0, stdout = '', stderr = '' } = {}) {
  return {
    cwd: CWD,
    exists: (p) => marker ? p.endsWith(marker) : false,
    spawn: vi.fn(() => ({ status: spawnStatus, stdout, stderr })),
  };
}

describe('pytest', () => {
  it('retourne null si projet non-Python', () => {
    const opts = makeOpts({ marker: null });
    expect(run(opts)).toBeNull();
    expect(opts.spawn).not.toHaveBeenCalled();
  });

  it('détecte pyproject.toml et lance pytest', () => {
    const opts = makeOpts({ marker: 'pyproject.toml' });
    run(opts);
    expect(opts.spawn).toHaveBeenCalledWith(
      'uv', ['run', 'pytest', '--tb=short', '-q'],
      expect.objectContaining({ cwd: CWD }),
    );
  });

  it('détecte pytest.ini', () => {
    const opts = makeOpts({ marker: 'pytest.ini' });
    const result = run(opts);
    expect(result).not.toBeNull();
    expect(opts.spawn).toHaveBeenCalled();
  });

  it('retourne status 0 et message succès', () => {
    const opts = makeOpts({ spawnStatus: 0, stdout: '5 passed in 0.3s' });
    const result = run(opts);
    expect(result.status).toBe(0);
    expect(result.message).toContain('✓ Tests passés');
  });

  it('retourne status non-0 et message échec', () => {
    const opts = makeOpts({ spawnStatus: 1, stderr: 'FAILED test_foo.py' });
    const result = run(opts);
    expect(result.status).toBe(1);
    expect(result.message).toContain('ÉCHEC');
    expect(result.message).toContain('FAILED test_foo.py');
  });
});
