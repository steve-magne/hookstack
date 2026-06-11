// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/post-edit-conflict-marker-check.mjs';

// Marqueurs construits dynamiquement pour ne pas laisser de vrais marqueurs
// de conflit dans ce fichier de test.
const OPEN = '<'.repeat(7) + ' HEAD';
const SEP = '='.repeat(7);
const CLOSE = '>'.repeat(7) + ' feature-branch';
const conflicted = ['const a = 1;', OPEN, 'const b = 2;', SEP, 'const b = 3;', CLOSE].join('\n');

const deps = (content) => ({
  readFile: vi.fn(() => content),
  fileExists: vi.fn(() => true),
});

describe('post-edit-conflict-marker-check', () => {
  it('laisse passer si tool_input absent', () => {
    expect(run({ tool_name: 'Write' }, deps(''))).toBeNull();
  });

  it("laisse passer si le fichier n'existe pas", () => {
    const r = run(
      { tool_input: { file_path: 'gone.ts' } },
      { readFile: vi.fn(), fileExists: vi.fn(() => false) },
    );
    expect(r).toBeNull();
  });

  it('laisse passer un fichier sain', () => {
    expect(run({ tool_input: { file_path: 'a.ts' } }, deps('const x = 1;\n'))).toBeNull();
  });

  it('laisse passer un souligné markdown (======= seul)', () => {
    expect(run({ tool_input: { file_path: 'doc.md' } }, deps(`Titre\n${SEP}\ntexte\n`))).toBeNull();
  });

  it("laisse passer une borne ouvrante sans fermante (faux positif improbable)", () => {
    expect(run({ tool_input: { file_path: 'a.ts' } }, deps(`${OPEN}\ncode\n`))).toBeNull();
  });

  it('signale un fichier avec les deux bornes de conflit', () => {
    const r = run({ tool_input: { file_path: 'src/a.ts' } }, deps(conflicted));
    expect(r?.message).toContain('src/a.ts');
    expect(r?.message).toContain('conflict markers');
  });

  it('reste silencieux si la lecture échoue', () => {
    const r = run(
      { tool_input: { file_path: 'a.ts' } },
      { readFile: vi.fn(() => { throw new Error('EACCES'); }), fileExists: vi.fn(() => true) },
    );
    expect(r).toBeNull();
  });
});
