// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/env-gitignore-guard.mjs';

const write = (file_path) => ({ tool_name: 'Write', tool_input: { file_path } });
// deps : .gitignore présent avec le contenu donné (null = pas de .gitignore)
const deps = (gitignore) => ({
  fileExists: vi.fn((p) => gitignore !== null && p.endsWith('.gitignore')),
  readFile: vi.fn(() => gitignore ?? ''),
});

describe('env-gitignore-guard', () => {
  it('avertit si .env non couvert par .gitignore', () => {
    expect(run(write('/proj/.env'), deps('node_modules\n'))?.message).toContain('.gitignore');
  });

  it('avertit si aucun .gitignore', () => {
    expect(run(write('/proj/.env.local'), deps(null))?.message).toBeTruthy();
  });

  it('reste silencieux si .env* est gitignoré', () => {
    expect(run(write('/proj/.env'), deps('.env*\n'))).toBeNull();
  });

  it('reste silencieux pour un modèle .env.example', () => {
    expect(run(write('/proj/.env.example'), deps(null))).toBeNull();
  });

  it('ignore un fichier source ordinaire', () => {
    expect(run(write('/proj/src/index.ts'), deps(null))).toBeNull();
  });

  it('ne bloque jamais (message seulement)', () => {
    expect(run(write('/proj/.env'), deps(null))?.decision).toBeUndefined();
  });
});
