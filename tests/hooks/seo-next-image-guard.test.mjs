// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/seo-next-image-guard.mjs';

const input = (file_path) => ({ tool_input: { file_path } });
const FILE = '/p/src/components/Hero.tsx';

describe('seo-next-image-guard', () => {
  it('ignore les fichiers hors src/', () => {
    expect(run(input('/p/scripts/x.tsx'), { readFile: () => '<img src="a" />' })).toBeNull();
  });

  it('ignore les fichiers non .tsx', () => {
    expect(run(input('/p/src/lib/x.ts'), { readFile: () => '<img src="a" />' })).toBeNull();
  });

  it('ignore un fichier illisible', () => {
    expect(run(input(FILE), { readFile: () => { throw new Error('ENOENT'); } })).toBeNull();
  });

  it('silencieux avec next/image <Image>', () => {
    expect(run(input(FILE), { readFile: () => '<Image src={x} alt="a" width={10} height={10} />' })).toBeNull();
  });

  it('signale un <img> brut', () => {
    const r = run(input(FILE), { readFile: () => 'return <img src="/a.png" alt="a" />;' });
    expect(r?.message).toContain('raw <img>');
  });

  it('ne confond pas <Image> avec <img>', () => {
    expect(run(input(FILE), { readFile: () => '<Image alt="x" />' })).toBeNull();
  });
});
