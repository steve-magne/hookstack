// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/protect-lockfiles.mjs';

describe('protect-lockfiles', () => {
  it('bloque pnpm-lock.yaml', () => {
    expect(run({ tool_input: { file_path: '/project/pnpm-lock.yaml' } })?.decision).toBe('block');
  });

  it('bloque package-lock.json', () => {
    expect(run({ tool_input: { file_path: '/project/package-lock.json' } })?.decision).toBe('block');
  });

  it('bloque yarn.lock', () => {
    expect(run({ tool_input: { file_path: '/project/yarn.lock' } })?.decision).toBe('block');
  });

  it('bloque Gemfile.lock', () => {
    expect(run({ tool_input: { file_path: '/project/Gemfile.lock' } })?.decision).toBe('block');
  });

  it('bloque poetry.lock', () => {
    expect(run({ tool_input: { file_path: '/project/poetry.lock' } })?.decision).toBe('block');
  });

  it('bloque Cargo.lock', () => {
    expect(run({ tool_input: { file_path: '/project/Cargo.lock' } })?.decision).toBe('block');
  });

  it('laisse passer package.json', () => {
    expect(run({ tool_input: { file_path: '/project/package.json' } })).toBeNull();
  });

  it('laisse passer un fichier .ts', () => {
    expect(run({ tool_input: { file_path: '/project/src/index.ts' } })).toBeNull();
  });

  it('laisse passer si file_path absent', () => {
    expect(run({ tool_input: {} })).toBeNull();
  });

  it('laisse passer si tool_input absent', () => {
    expect(run({})).toBeNull();
  });
});
