// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/seo-page-metadata-guard.mjs';

const input = (file_path) => ({ tool_input: { file_path } });
const PAGE = '/p/src/app/about/page.tsx';

describe('seo-page-metadata-guard', () => {
  it('ignore les fichiers hors page.tsx', () => {
    expect(run(input('/p/src/components/Header.tsx'), { readFile: () => '' })).toBeNull();
  });

  it('ignore un fichier illisible', () => {
    expect(run(input(PAGE), { readFile: () => { throw new Error('ENOENT'); } })).toBeNull();
  });

  it('silencieux quand metadata + title + description sont présents', () => {
    const code = "export const metadata = { title: 'A', description: 'B' };\nexport default function P() {}";
    expect(run(input(PAGE), { readFile: () => code })).toBeNull();
  });

  it('accepte generateMetadata', () => {
    const code = 'export async function generateMetadata() { return { title: x, description: y }; }';
    expect(run(input(PAGE), { readFile: () => code })).toBeNull();
  });

  it('signale une page sans aucune metadata', () => {
    const r = run(input(PAGE), { readFile: () => 'export default function P() { return null; }' });
    expect(r?.message).toContain('exports no metadata');
  });

  it('signale une description manquante', () => {
    const r = run(input(PAGE), { readFile: () => "export const metadata = { title: 'A' };" });
    expect(r?.message).toContain('description');
    expect(r?.message).not.toContain('title,');
  });

  it('signale title et description manquants', () => {
    const r = run(input(PAGE), { readFile: () => 'export const metadata = { robots: {} };' });
    expect(r?.message).toContain('title, description');
  });

  it('gère la route racine src/app/page.tsx', () => {
    const r = run(input('/p/src/app/page.tsx'), { readFile: () => 'export default function P() {}' });
    expect(r?.message).toContain('exports no metadata');
  });
});
