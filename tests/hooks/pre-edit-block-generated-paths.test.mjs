// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/block-generated-paths.mjs';

const edit = (file_path) => ({ tool_name: 'Edit', tool_input: { file_path } });

describe('block-generated-paths', () => {
  it('bloque node_modules', () => {
    expect(run(edit('/proj/node_modules/foo/index.js'))?.decision).toBe('block');
  });

  it('bloque .next', () => {
    expect(run(edit('/proj/.next/server/app.js'))?.decision).toBe('block');
  });

  it('bloque dist', () => {
    expect(run(edit('/proj/dist/bundle.js'))?.decision).toBe('block');
  });

  it('bloque __pycache__', () => {
    expect(run(edit('/proj/pkg/__pycache__/mod.pyc'))?.decision).toBe('block');
  });

  it('laisse passer un fichier source', () => {
    expect(run(edit('/proj/src/index.ts'))).toBeNull();
  });

  it('ne déclenche pas sur un nom qui contient "build" sans segment isolé', () => {
    expect(run(edit('/proj/src/buildConfig.ts'))).toBeNull();
  });

  it('laisse passer si file_path absent', () => {
    expect(run({ tool_input: {} })).toBeNull();
  });
});
