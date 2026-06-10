// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/motion-rules-guard.mjs';

const input = (file_path) => ({ tool_input: { file_path } });
const FILE = '/p/src/components/Hero.tsx';

describe('motion-rules-guard', () => {
  it('ignore les fichiers hors src/', () => {
    expect(run(input('/p/scripts/build.ts'), { readFile: () => 'motion.div' })).toBeNull();
  });

  it('ignore les fichiers non JS/TS', () => {
    expect(run(input('/p/src/app/globals.css'), { readFile: () => 'prefers-reduced-motion' })).toBeNull();
  });

  it('ignore un fichier illisible', () => {
    expect(run(input(FILE), { readFile: () => { throw new Error('ENOENT'); } })).toBeNull();
  });

  it('silencieux sur un composant conforme', () => {
    const code = "import { m } from 'motion/react';\nexport const X = () => <m.div animate={{ x: 10, opacity: 1 }} />;";
    expect(run(input(FILE), { readFile: () => code })).toBeNull();
  });

  it('signale un import framer-motion', () => {
    const r = run(input(FILE), { readFile: () => "import { motion } from 'framer-motion';" });
    expect(r?.message).toContain("motion/react");
  });

  it('signale un élément motion.* (LazyMotion strict)', () => {
    const r = run(input(FILE), { readFile: () => 'return <motion.div animate={{ opacity: 1 }} />;' });
    expect(r?.message).toContain('<m.*>');
  });

  it('signale une media query prefers-reduced-motion manuelle', () => {
    const r = run(input(FILE), { readFile: () => "const q = window.matchMedia('(prefers-reduced-motion: reduce)');" });
    expect(r?.message).toContain('MotionConfig');
  });

  it('signale une animation de width/height', () => {
    const r = run(input(FILE), { readFile: () => '<m.div animate={{ width: 300 }} />' });
    expect(r?.message).toContain('transform');
  });

  it('cumule plusieurs violations dans un seul message', () => {
    const code = "import { motion } from 'framer-motion';\n<motion.div animate={{ height: 10 }} />";
    const r = run(input(FILE), { readFile: () => code });
    expect(r?.message.match(/^ {2}- /gm)?.length).toBe(3);
  });
});
