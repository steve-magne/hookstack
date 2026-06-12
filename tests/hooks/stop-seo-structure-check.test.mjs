// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { run } from '../../.claude/hooks/stop-seo-structure-check.mjs';

const META = "export const metadata = { title: 'T', description: 'D' };";

// ── Tests unitaires : dépendances injectées, une branche par cas ──────────────
describe('stop-seo-structure-check (injecté)', () => {
  const base = {
    projectDir: '/p',
    exists: () => true,
    listDirs: () => ['about', 'guides'],
    walkTsx: (dir) =>
      dir.endsWith('src/app')
        ? ['/p/src/app/page.tsx']
        : ['/p/src/app/page.tsx', '/p/src/components/Header.tsx'],
    readFile: (p) =>
      p.endsWith('page.tsx') ? META : '<Link href="/about">x</Link>',
  };

  it('no-op si src/app absent (pas un projet Next)', () => {
    expect(run({}, { ...base, exists: () => false })).toBeNull();
  });

  it('silencieux quand tout est conforme', () => {
    expect(run({}, base)).toBeNull();
  });

  it('bloque (exitCode 2) si une page manque de métadonnées', () => {
    const out = run({}, { ...base, readFile: (p) => (p.endsWith('page.tsx') ? 'export default function P(){}' : '') });
    expect(out?.exitCode).toBe(2);
    expect(out?.message).toContain('metadata missing');
  });

  it('signale un fichier structurel manquant (sitemap)', () => {
    const out = run({}, { ...base, exists: (p) => !/sitemap/.test(p) });
    expect(out?.message).toContain('sitemap');
  });

  it('signale un lien interne cassé', () => {
    const out = run({}, {
      ...base,
      readFile: (p) => (p.endsWith('page.tsx') ? META : '<Link href="/guide/x">x</Link>'),
    });
    expect(out?.message).toContain('broken internal link "/guide/x"');
  });

  it('ignore les ancres et la racine', () => {
    const out = run({}, {
      ...base,
      readFile: (p) => (p.endsWith('page.tsx') ? META : '<Link href="/">a</Link><Link href="/#catalogue">b</Link>'),
    });
    expect(out).toBeNull();
  });
});

// ── Test d'intégration : vrai dossier temporaire, walkers fs par défaut ────────
describe('stop-seo-structure-check (fs réel)', () => {
  let dir;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'seo-gate-'));
    const app = join(dir, 'src/app');
    mkdirSync(join(app, 'about'), { recursive: true });
    mkdirSync(join(dir, 'src/components'), { recursive: true });
    writeFileSync(join(app, 'page.tsx'), META);
    writeFileSync(join(app, 'about/page.tsx'), META);
    for (const f of ['robots.ts', 'sitemap.ts', 'opengraph-image.tsx', 'manifest.ts']) {
      writeFileSync(join(app, f), '// stub');
    }
    writeFileSync(join(dir, 'src/components/Nav.tsx'), '<Link href="/about">About</Link>');
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('passe sur une arbo Next complète', () => {
    expect(run({}, { projectDir: dir })).toBeNull();
  });

  it('attrape un lien cassé ajouté', () => {
    writeFileSync(join(dir, 'src/components/Bad.tsx'), '<Link href="/contatc">x</Link>');
    const out = run({}, { projectDir: dir });
    expect(out?.exitCode).toBe(2);
    expect(out?.message).toContain('/contatc');
  });
});
