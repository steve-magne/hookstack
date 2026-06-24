// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/stop-dead-link-checker.mjs';

// helpers pour construire un mini-fs fictif
function makeFs({ files = {}, dirs = [] } = {}) {
  return {
    projectDir: '/proj',
    exists: (p) => p in files || dirs.includes(p) || p === '/proj',
    readdir: (dir, _opts) => {
      const entries = [];
      for (const [fp] of Object.entries(files)) {
        if (fp.startsWith(`${dir}/`)) {
          const rel = fp.slice(dir.length + 1);
          if (!rel.includes('/')) {
            entries.push({ name: rel, isDirectory: () => false });
          }
        }
      }
      for (const d of dirs) {
        if (d.startsWith(`${dir}/`) && !d.slice(dir.length + 1).includes('/')) {
          const name = d.slice(dir.length + 1);
          entries.push({ name, isDirectory: () => true });
        }
      }
      return entries;
    },
    readFile: (p) => {
      if (p in files) return files[p];
      throw new Error('ENOENT');
    },
  };
}

describe('stop-dead-link-checker', () => {
  it('retourne null si aucun fichier .md trouvé', () => {
    expect(run({}, makeFs({ files: { '/proj/src/index.ts': '' } }))).toBeNull();
  });

  it('retourne null si tous les liens relatifs existent', () => {
    const deps = makeFs({
      files: {
        '/proj/README.md': '[guide](./docs/guide.md)',
        '/proj/docs/guide.md': '# Guide',
      },
      dirs: ['/proj/docs'],
    });
    expect(run({}, deps)).toBeNull();
  });

  it('retourne un message si un lien relatif est cassé', () => {
    const deps = makeFs({
      files: { '/proj/README.md': '[missing](./docs/missing.md)' },
    });
    const r = run({}, deps);
    expect(r?.message).toContain('[dead-link-checker]');
    expect(r?.message).toContain('README.md');
    expect(r?.message).toContain('./docs/missing.md');
  });

  it('ignore les liens HTTP/HTTPS (pas de réseau)', () => {
    const deps = makeFs({
      files: { '/proj/README.md': '[ext](https://example.com/404)' },
    });
    expect(run({}, deps)).toBeNull();
  });

  it('ignore les ancres pures (#section)', () => {
    const deps = makeFs({
      files: { '/proj/README.md': '[sec](#installation)' },
    });
    expect(run({}, deps)).toBeNull();
  });

  it('ignore les liens mailto:', () => {
    const deps = makeFs({
      files: { '/proj/README.md': '[email](mailto:foo@bar.com)' },
    });
    expect(run({}, deps)).toBeNull();
  });

  it('ignore les images ![alt](src)', () => {
    const deps = makeFs({
      files: { '/proj/README.md': '![logo](./assets/logo.png)' },
    });
    // pas d'asset sur le fs — mais c'est une image, pas un lien → ne doit pas bloquer
    // (la regex exclut les images avec (?<!!) donc rien n'est signalé)
    // On ne crée pas l'asset → si la regex était mal calibrée on aurait un broken link
    expect(run({}, deps)).toBeNull();
  });

  it('couvre tous les fichiers .md et .mdx (scan complet, pas seulement les modifiés)', () => {
    const readFile = vi.fn(() => '');
    const deps = {
      projectDir: '/proj',
      exists: (p) => ['/proj', '/proj/a.md', '/proj/b.mdx', '/proj/c.ts'].includes(p),
      readdir: (dir) => dir === '/proj'
        ? [
            { name: 'a.md', isDirectory: () => false },
            { name: 'b.mdx', isDirectory: () => false },
            { name: 'c.ts', isDirectory: () => false },
          ]
        : [],
      readFile,
    };
    run({}, deps);
    const readPaths = readFile.mock.calls.map(([p]) => p);
    expect(readPaths).toContain('/proj/a.md');
    expect(readPaths).toContain('/proj/b.mdx');
    expect(readPaths).not.toContain('/proj/c.ts');
  });

  it('ignore les répertoires node_modules, .git, .claude, .next', () => {
    const readdir = vi.fn((dir) => {
      if (dir === '/proj') return [
        { name: 'node_modules', isDirectory: () => true },
        { name: '.git', isDirectory: () => true },
        { name: '.claude', isDirectory: () => true },
        { name: '.next', isDirectory: () => true },
        { name: 'README.md', isDirectory: () => false },
      ];
      return [];
    });
    const deps = {
      projectDir: '/proj',
      exists: () => true,
      readdir,
      readFile: () => '',
    };
    run({}, deps);
    const dirs = readdir.mock.calls.map(([d]) => d);
    expect(dirs).not.toContain('/proj/node_modules');
    expect(dirs).not.toContain('/proj/.git');
    expect(dirs).not.toContain('/proj/.claude');
  });
});
