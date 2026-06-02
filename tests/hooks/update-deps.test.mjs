// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/update-deps.mjs';

const DIR = '/repos/hookstack';

describe('update-deps', () => {
  it('ne fait rien si git rev-parse échoue', () => {
    const exec = vi.fn(() => '');
    run({ exec, exists: () => true });
    expect(exec).toHaveBeenCalledTimes(1);
  });

  it('ne fait rien si package.json absent', () => {
    const exec = vi.fn((cmd) => cmd.includes('rev-parse') ? DIR : '');
    run({ exec, exists: () => false });
    expect(exec).toHaveBeenCalledTimes(1);
  });

  it('utilise pnpm si disponible', () => {
    const exec = vi.fn((cmd) => {
      if (cmd.includes('rev-parse')) return DIR;
      if (cmd.includes('which pnpm')) return '/usr/local/bin/pnpm';
      return 'pnpm output';
    });
    run({ exec, exists: () => true });
    expect(exec).toHaveBeenCalledWith('pnpm install --frozen-lockfile --ignore-scripts', { cwd: DIR });
  });

  it('utilise npm ci si pnpm absent', () => {
    const exec = vi.fn((cmd) => {
      if (cmd.includes('rev-parse')) return DIR;
      if (cmd.includes('which pnpm')) return '';
      return 'npm output line1\nline2';
    });
    run({ exec, exists: () => true });
    expect(exec).toHaveBeenCalledWith('npm ci --ignore-scripts', { cwd: DIR });
  });
});
