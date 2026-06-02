// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/load-instructions.mjs';

describe('load-instructions', () => {
  it('charge et sauvegarde les instructions présentes', () => {
    const writeFile = vi.fn();
    const r = run({
      exists: () => true,
      readFile: () => 'Mes instructions',
      writeFile,
      projectDir: '/proj',
      tmpFile: '/tmp/x.md',
    });
    expect(writeFile).toHaveBeenCalledWith('/tmp/x.md', 'Mes instructions');
    expect(r?.message).toContain('Instructions chargées');
  });

  it('retourne null si le fichier est absent', () => {
    const writeFile = vi.fn();
    expect(run({ exists: () => false, writeFile, projectDir: '/proj' })).toBeNull();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('retourne null si le fichier est vide', () => {
    expect(run({ exists: () => true, readFile: () => '  ', writeFile: vi.fn(), projectDir: '/proj' })).toBeNull();
  });
});
