// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/a11y-jsx-guard.mjs';
import { makeExecFail } from './_utils.mjs';

const inp = (file_path) => ({ tool_input: { file_path } });
const FILE = '/p/src/components/Card.tsx';

// exists: () => false force le chemin statique (zéro-dépendance)
const noBiome = { exists: () => false };
const r = (code) => run(inp(FILE), { ...noBiome, readFile: () => code });

// ── Chemin statique (Biome absent) ────────────────────────────────────────────

describe('a11y-jsx-guard — statique (fallback)', () => {
  it('ignore les fichiers hors src/', () => {
    expect(run(inp('/p/x.tsx'), { ...noBiome, readFile: () => '<Image src={x} />' })).toBeNull();
  });

  it('ignore un fichier .ts (pas du JSX)', () => {
    expect(run(inp('/p/src/lib/utils.ts'), { ...noBiome, readFile: () => 'export const x = 1;' })).toBeNull();
  });

  it('accepte les fichiers .jsx', () => {
    expect(run(inp('/p/src/components/Btn.jsx'), { ...noBiome, readFile: () => '<Image src={x} />' })?.message).toContain('alt');
  });

  it('ignore un fichier illisible', () => {
    expect(run(inp(FILE), { ...noBiome, readFile: () => { throw new Error('ENOENT'); } })).toBeNull();
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

// ── Chemin Biome (a11y natif, aucun plugin requis) ────────────────────────────

const FILE_TSX = '/p/src/components/Foo.tsx';

function rdjson(ruleId, message, line = 1) {
  return JSON.stringify({
    diagnostics: [{ code: { value: ruleId }, message, location: { range: { start: { line } } } }],
  });
}

function biomeDeps(execOverride) {
  return {
    exec: execOverride ?? vi.fn(() => ''),
    exists: () => true,
    projectDir: '/p',
  };
}

describe('a11y-jsx-guard — Biome (installé)', () => {
  it('silencieux si Biome ne retourne aucune violation', () => {
    expect(run(inp(FILE_TSX), biomeDeps())).toBeNull();
  });

  it('silencieux si la sortie n\'est pas du JSON valide', () => {
    expect(run(inp(FILE_TSX), biomeDeps(makeExecFail('biome: command not found')))).toBeNull();
  });

  it('silencieux si les violations ne sont pas a11y', () => {
    const json = JSON.stringify({ diagnostics: [{ code: { value: 'lint/correctness/noUnusedImports' }, message: 'unused', location: { range: { start: { line: 1 } } } }] });
    expect(run(inp(FILE_TSX), biomeDeps(makeExecFail(json)))).toBeNull();
  });

  it('reporte une violation', () => {
    const r = run(inp(FILE_TSX), biomeDeps(makeExecFail(rdjson('lint/a11y/useAltText', 'img needs alt', 5))));
    expect(r?.message).toContain('✗ lint/a11y/useAltText');
    expect(r?.message).toContain('line 5');
  });

  it('cumule plusieurs violations', () => {
    const json = JSON.stringify({
      diagnostics: [
        { code: { value: 'lint/a11y/useAltText' }, message: 'img needs alt', location: { range: { start: { line: 1 } } } },
        { code: { value: 'lint/a11y/useKeyWithClickEvents' }, message: 'needs key', location: { range: { start: { line: 3 } } } },
      ],
    });
    const r = run(inp(FILE_TSX), biomeDeps(makeExecFail(json)));
    expect(r?.message.match(/^ {2}✗ /gm)?.length).toBe(2);
  });
});
