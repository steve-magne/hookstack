// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/a11y-jsx-guard.mjs';

const input = (file_path) => ({ tool_input: { file_path } });
const FILE = '/p/src/components/Card.tsx';
const r = (code) => run(input(FILE), { readFile: () => code });

describe('a11y-jsx-guard', () => {
  it('ignore les fichiers hors src/', () => {
    expect(run(input('/p/x.tsx'), { readFile: () => '<Image src={x} />' })).toBeNull();
  });

  it('ignore un fichier illisible', () => {
    expect(run(input(FILE), { readFile: () => { throw new Error('ENOENT'); } })).toBeNull();
  });

  it('silencieux sur un composant conforme', () => {
    const code =
      '<Image src={x} alt="a" />\n<a href="/x" target="_blank" rel="noopener noreferrer">x</a>\n' +
      '<button onClick={f}>go</button>';
    expect(r(code)).toBeNull();
  });

  it('signale un <Image> sans alt', () => {
    expect(r('<Image src={x} width={10} />')?.message).toContain('without an `alt`');
  });

  it('accepte un alt vide (décoratif)', () => {
    expect(r('<Image src={x} alt="" />')).toBeNull();
  });

  it('signale un tabIndex positif', () => {
    expect(r('<div tabIndex={3} />')?.message).toContain('positive tabIndex');
  });

  it('accepte tabIndex={0}', () => {
    expect(r('<div tabIndex={0} />')).toBeNull();
  });

  it('signale target=_blank sans rel noopener', () => {
    expect(r('<a href="/x" target="_blank">x</a>')?.message).toContain('rel="noopener');
  });

  it('signale onClick sur div sans role ni clavier', () => {
    expect(r('<div onClick={f}>x</div>')?.message).toContain('non-interactive element');
  });

  it('accepte onClick sur div avec role + onKeyDown', () => {
    expect(r('<div onClick={f} role="button" onKeyDown={k}>x</div>')).toBeNull();
  });

  it('ne tronque pas la balise sur une fonction fléchée (le `>` de =>)', () => {
    // Régression : un `>` issu de `() =>` ne doit pas couper la balise avant role/onKeyDown.
    const code =
      '<div\n  onClick={() => setOpen((v) => !v)}\n  role="button"\n  tabIndex={0}\n' +
      '  onKeyDown={(e) => { if (e.key === "Enter") setOpen(true); }}\n>content</div>';
    expect(r(code)).toBeNull();
  });

  it('ne se laisse pas berner par un `>` dans une chaîne', () => {
    expect(r('<div title="a > b" onClick={f} role="button" onKeyDown={k}>x</div>')).toBeNull();
  });

  it('cumule plusieurs violations', () => {
    const code = '<Image src={x} />\n<div tabIndex={2} onClick={f}>x</div>';
    expect(r(code)?.message.match(/^ {2}- /gm)?.length).toBe(3);
  });
});
