// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/a11y-jsx-guard.mjs';
import { makeExecFail } from './_utils.mjs';

const inp = (file_path) => ({ tool_input: { file_path } });
const FILE = '/p/src/components/Card.tsx';

// exists: () => false force le chemin statique (zéro-dépendance)
const noPlugin = { exists: () => false };
const r = (code) => run(inp(FILE), { ...noPlugin, readFile: () => code });

// ── Chemin statique (eslint-plugin-jsx-a11y absent) ───────────────────────────

describe('a11y-jsx-guard — statique (fallback)', () => {
  it('ignore les fichiers hors src/', () => {
    expect(run(inp('/p/x.tsx'), { ...noPlugin, readFile: () => '<Image src={x} />' })).toBeNull();
  });

  it('ignore un fichier .ts (pas du JSX)', () => {
    expect(run(inp('/p/src/lib/utils.ts'), { ...noPlugin, readFile: () => 'export const x = 1;' })).toBeNull();
  });

  it('accepte les fichiers .jsx', () => {
    expect(run(inp('/p/src/components/Btn.jsx'), { ...noPlugin, readFile: () => '<Image src={x} />' })?.message).toContain('alt');
  });

  it('ignore un fichier illisible', () => {
    expect(run(inp(FILE), { ...noPlugin, readFile: () => { throw new Error('ENOENT'); } })).toBeNull();
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

// ── Chemin ESLint (eslint-plugin-jsx-a11y présent) ────────────────────────────

const FILE_TSX = '/p/src/components/Foo.tsx';

function eslintJson(ruleId, message, line = 1, severity = 2) {
  return JSON.stringify([{ filePath: FILE_TSX, messages: [{ ruleId, message, line, severity }] }]);
}

function eslintDeps(execOverride, eslintVersion = '8.57.0') {
  return {
    exec: execOverride ?? vi.fn(() => ''),
    exists: () => true,
    writeFile: vi.fn(),
    unlink: vi.fn(),
    readFile: () => JSON.stringify({ version: eslintVersion }),
    projectDir: '/p',
  };
}

describe('a11y-jsx-guard — ESLint (plugin disponible)', () => {
  it('silencieux si ESLint ne retourne aucune violation', () => {
    expect(run(inp(FILE_TSX), eslintDeps())).toBeNull();
  });

  it('no-op si eslint/package.json est illisible', () => {
    const deps = { ...eslintDeps(), readFile: () => { throw new Error('ENOENT'); } };
    expect(run(inp(FILE_TSX), deps)).toBeNull();
  });

  it('silencieux si la sortie n\'est pas du JSON valide', () => {
    expect(run(inp(FILE_TSX), eslintDeps(makeExecFail('eslint: command not found')))).toBeNull();
  });

  it('silencieux si les violations ne sont pas jsx-a11y', () => {
    const json = JSON.stringify([{ messages: [{ ruleId: 'no-console', message: 'msg', line: 1, severity: 2 }] }]);
    expect(run(inp(FILE_TSX), eslintDeps(makeExecFail(json)))).toBeNull();
  });

  it('reporte une violation error (✗)', () => {
    const r = run(inp(FILE_TSX), eslintDeps(makeExecFail(eslintJson('jsx-a11y/alt-text', 'img needs alt', 5))));
    expect(r?.message).toContain('✗ jsx-a11y/alt-text');
    expect(r?.message).toContain('line 5');
  });

  it('reporte une violation warn (⚠)', () => {
    const r = run(inp(FILE_TSX), eslintDeps(makeExecFail(eslintJson('jsx-a11y/click-events-have-key-events', 'needs key', 3, 1))));
    expect(r?.message).toContain('⚠ jsx-a11y/click-events-have-key-events');
  });

  it('crée une config JSON (no-eslintrc) pour ESLint v8', () => {
    const writeFile = vi.fn();
    run(inp(FILE_TSX), { ...eslintDeps(), writeFile });
    const [path, content] = writeFile.mock.calls[0];
    expect(path).toMatch(/\.json$/);
    expect(JSON.parse(content).plugins).toContain('jsx-a11y');
  });

  it('crée une flat config .mjs pour ESLint v9', () => {
    const writeFile = vi.fn();
    run(inp(FILE_TSX), { ...eslintDeps(undefined, '9.5.0'), writeFile });
    const [path, content] = writeFile.mock.calls[0];
    expect(path).toMatch(/\.mjs$/);
    expect(content).toContain('export default');
  });

  it('nettoie le fichier config temp dans tous les cas', () => {
    const unlink = vi.fn();
    run(inp(FILE_TSX), { ...eslintDeps(makeExecFail(eslintJson('jsx-a11y/alt-text', 'missing', 1))), unlink });
    expect(unlink).toHaveBeenCalledOnce();
  });
});
