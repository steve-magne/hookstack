// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/pre-read-block-binary.mjs';

describe('pre-read-block-binary', () => {
  it('laisse passer si tool_name != Read', () => {
    expect(run({ tool_name: 'Write', tool_input: { file_path: 'app.exe' } })).toBeNull();
  });

  it('laisse passer si tool_input absent', () => {
    expect(run({ tool_name: 'Read' })).toBeNull();
  });

  it('laisse passer une extension supportée (.ts)', () => {
    expect(run({ tool_name: 'Read', tool_input: { file_path: 'src/index.ts' } })).toBeNull();
  });

  it('laisse passer un .json', () => {
    expect(run({ tool_name: 'Read', tool_input: { file_path: 'data.json' } })).toBeNull();
  });

  it('bloque un .exe', () => {
    const r = run({ tool_name: 'Read', tool_input: { file_path: '/usr/bin/app.exe' } });
    expect(r?.decision).toBe('block');
    expect(r?.reason).toContain('app.exe');
    expect(r?.reason).toContain('.exe');
  });

  it('bloque un .pyc', () => {
    expect(run({ tool_name: 'Read', tool_input: { file_path: '__pycache__/foo.pyc' } })?.decision).toBe('block');
  });

  it('bloque un .jar', () => {
    expect(run({ tool_name: 'Read', tool_input: { file_path: 'lib/spring.jar' } })?.decision).toBe('block');
  });

  it('bloque un .zip', () => {
    expect(run({ tool_name: 'Read', tool_input: { file_path: 'dist/bundle.zip' } })?.decision).toBe('block');
  });

  it('bloque un .pkl', () => {
    expect(run({ tool_name: 'Read', tool_input: { file_path: 'model.pkl' } })?.decision).toBe('block');
  });

  it('bloque un .sqlite3', () => {
    expect(run({ tool_name: 'Read', tool_input: { file_path: 'db/dev.sqlite3' } })?.decision).toBe('block');
  });

  it('bloque un .wasm', () => {
    expect(run({ tool_name: 'Read', tool_input: { file_path: 'lib/module.wasm' } })?.decision).toBe('block');
  });

  it('bloque un .so (extension majuscule)', () => {
    expect(run({ tool_name: 'Read', tool_input: { file_path: 'lib/native.SO' } })?.decision).toBe('block');
  });

  it('la reason mentionne de consulter Bash', () => {
    const r = run({ tool_name: 'Read', tool_input: { file_path: 'app.dll' } });
    expect(r?.reason).toContain('Bash');
  });
});
