#!/usr/bin/env node
// @hookstack stop-seo-structure-check
// Gate SEO structurel en fin de session (Stop) — l'équivalent « suite de tests » pour
// le référencement. Sur un projet Next.js App Router (src/app présent), vérifie en
// statique, sans navigateur ni réseau :
//   1. chaque page.tsx exporte ses métadonnées (title + description)
//   2. les fichiers structurels existent : robots, sitemap, image OpenGraph, manifest
//   3. chaque <Link href="/…"> interne littéral pointe vers une route connue (broken-link)
// Bloquant (exitCode 2) si une régression est trouvée ; silencieux sinon.
// La validité runtime des schémas JSON-LD et des Core Web Vitals relève du skill seo-geo-aeo.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

function defaultWalkTsx(dir, { exists = existsSync, readdir = readdirSync } = {}) {
  if (!exists(dir)) return [];
  const out = [];
  for (const entry of readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...defaultWalkTsx(full, { exists, readdir }));
    else if (entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

function defaultListDirs(dir, { exists = existsSync, readdir = readdirSync } = {}) {
  if (!exists(dir)) return [];
  return readdir(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

function hasMetadata(content) {
  const present =
    /export\s+(?:const|let)\s+metadata\b/.test(content) ||
    /export\s+(?:async\s+)?function\s+generateMetadata\b/.test(content) ||
    /export\s*\{[^}]*\bmetadata\b[^}]*\}/.test(content);
  return present && /\btitle\s*:/.test(content) && /\bdescription\s*:/.test(content);
}

export function run(_input, deps = {}) {
  const {
    projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
    readFile = readFileSync,
    exists = existsSync,
    walkTsx = (dir) => defaultWalkTsx(dir),
    listDirs = (dir) => defaultListDirs(dir),
  } = deps;

  const appDir = join(projectDir, 'src/app');
  if (!exists(appDir)) return null; // pas un projet Next App Router → no-op

  const problems = [];
  const read = (p) => {
    try {
      return readFile(p, 'utf8');
    } catch {
      return '';
    }
  };

  // 1. Couverture métadonnées sur chaque page.tsx
  const pages = walkTsx(appDir).filter((p) => p.endsWith('page.tsx'));
  for (const page of pages) {
    if (!hasMetadata(read(page))) {
      problems.push(`metadata missing (title + description) → ${page.replace(`${projectDir}/`, '')}`);
    }
  }

  // 2. Fichiers structurels (au moins un candidat par catégorie)
  const need = [
    ['robots', ['src/app/robots.ts', 'src/app/robots.txt', 'public/robots.txt']],
    ['sitemap', ['src/app/sitemap.ts', 'src/app/sitemap.xml', 'public/sitemap.xml']],
    [
      'OpenGraph image',
      ['src/app/opengraph-image.tsx', 'src/app/opengraph-image.png', 'src/app/opengraph-image.jpg'],
    ],
    ['web manifest', ['src/app/manifest.ts', 'public/site.webmanifest', 'public/manifest.json']],
  ];
  for (const [label, candidates] of need) {
    if (!candidates.some((c) => exists(join(projectDir, c)))) {
      problems.push(`${label} missing → expected one of: ${candidates.join(', ')}`);
    }
  }

  // 3. Liens internes cassés (<Link href="/…"> littéral vers une route inconnue)
  const routes = new Set(listDirs(appDir)); // segments de 1er niveau (about, guides, hook, …)
  const LINK_RE = /<Link\b[^>]*\bhref=["'](\/[^"'#?]*)/g;
  for (const file of walkTsx(join(projectDir, 'src'))) {
    const content = read(file);
    for (const [, href] of content.matchAll(LINK_RE)) {
      if (href === '/') continue; // racine
      const seg = href.split('/')[1];
      if (!seg || routes.has(seg)) continue; // ancre ou route connue
      problems.push(`broken internal link "${href}" → unknown route in ${file.replace(`${projectDir}/`, '')}`);
    }
  }

  if (!problems.length) return null;

  return {
    exitCode: 2,
    message:
      `[seo-structure] SEO gate failed — fix before ending the session:\n` +
      problems.map((p) => `  - ${p}`).join('\n') +
      '\n',
  };
}

/* v8 ignore next 6 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run();
  if (result?.message) process.stderr.write(result.message);
  if (result?.exitCode) process.exit(result.exitCode);
}
