#!/usr/bin/env node
/**
 * hooks-timeline.mjs — génère la « timeline d'évolution » du catalogue de hooks.
 *
 * Pourquoi (et pourquoi pas un git pre-commit) :
 *   Un pre-commit qui réécrit des fichiers suivis en plein milieu d'un commit est
 *   fragile (re-staging, boucles, surprises). On calque plutôt le pattern éprouvé
 *   de sync-hooks.mjs : un GÉNÉRATEUR déterministe + un garde-fou `--check` en CI.
 *
 * Ce que ça produit (3 artefacts, tous dérivés de l'historique git) :
 *   1. registry/hooks-timeline.json  → données consommées par le front (/evolution)
 *   2. public/hooks-timeline.svg     → heatmap « style contribution GitHub » pour le README
 *   3. bloc README entre marqueurs   → <!-- HOOKS_TIMELINE:START/END -->
 *
 * Source de vérité : la date de PREMIER ajout (git log --diff-filter=A) de chaque
 * .claude/hooks/*.mjs. Déterministe : aucun timestamp « now » n'entre dans la sortie,
 * pour que `--check` soit stable entre local et CI.
 *
 * Usage :
 *   node .claude/hooks-timeline.mjs            # génère les 3 artefacts
 *   node .claude/hooks-timeline.mjs --dry-run  # aperçu, aucune écriture
 *   node .claude/hooks-timeline.mjs --check    # CI : exit 1 si un artefact a dérivé
 *
 * Flux d'ajout d'un hook : committer le .mjs (pour qu'il ait une date git) → lancer
 * `pnpm timeline` → committer les 3 artefacts mis à jour. La CI `--check` valide.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const REGISTRY_PATH = resolve(ROOT, 'registry/registry.json');
const TIMELINE_PATH = resolve(ROOT, 'registry/hooks-timeline.json');
const SVG_PATH = resolve(ROOT, 'public/hooks-timeline.svg');
const README_PATH = resolve(ROOT, 'README.md');
const HOOKS_DIR = resolve(ROOT, '.claude/hooks');

const SITE = 'https://www.hookstack.app';
const START_MARK = '<!-- HOOKS_TIMELINE:START -->';
const END_MARK = '<!-- HOOKS_TIMELINE:END -->';

// ── Dépendances injectables (effets de bord) — réelles par défaut, fakées en test ──
const defaultDeps = {
  exec: (cmd) => execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout: 10_000 }),
  listHookFiles: () =>
    existsSync(HOOKS_DIR)
      ? readdirSync(HOOKS_DIR).filter((f) => f.endsWith('.mjs')).sort()
      : [],
  loadRegistry: () => JSON.parse(readFileSync(REGISTRY_PATH, 'utf8')),
};

// ─────────────────────────────────────────────────────────────────────────────
// Logique pure (testable)
// ─────────────────────────────────────────────────────────────────────────────

/** Date du PREMIER commit ayant ajouté ce fichier → 'YYYY-MM-DD' (ou null si non committé). */
export function gitCreationDate(relPath, exec) {
  try {
    const out = exec(
      `git log --diff-filter=A --follow --format=%aI -- "${relPath}"`,
    ).trim();
    if (!out) return null;
    // git liste du plus récent au plus ancien : la dernière ligne = ajout initial.
    const first = out.split('\n').pop().trim();
    return first.slice(0, 10);
  } catch {
    return null;
  }
}

/**
 * Construit la liste des hooks créés, enrichie depuis le registre (name/category),
 * triée par date d'ajout croissante puis par nom. Ignore les fichiers non committés
 * (sans date git) — ils entreront dans la timeline une fois committés.
 */
export function collectHooks({ files, registry, exec }) {
  // Index registre par basename de script_path (le slug peut différer du fichier).
  const byFile = new Map();
  for (const h of registry) {
    const sp = h.implementation?.script_path;
    if (sp) byFile.set(basename(sp), h);
  }

  const entries = [];
  for (const file of files) {
    const date = gitCreationDate(`.claude/hooks/${file}`, exec);
    if (!date) continue;
    const meta = byFile.get(file);
    const slug = meta?.slug ?? file.replace(/\.mjs$/, '');
    entries.push({
      slug,
      name: meta?.name ?? slug,
      category: meta?.category ?? 'workflow',
      date,
    });
  }

  entries.sort((a, b) => (a.date === b.date ? a.name.localeCompare(b.name) : a.date.localeCompare(b.date)));
  return entries;
}

/** Agrège les entrées en un objet timeline sérialisable et déterministe. */
export function buildTimeline(entries) {
  const byDay = {};
  for (const e of entries) byDay[e.date] = (byDay[e.date] ?? 0) + 1;
  const dates = Object.keys(byDay).sort();
  return {
    total: entries.length,
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
    byDay,
    hooks: entries,
  };
}

/** Niveau d'intensité 0..4 pour un nombre d'ajouts dans la journée (échelle GitHub-like). */
export function bucketLevel(count) {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

const ISO = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => {
  const c = new Date(d.getTime());
  c.setUTCDate(c.getUTCDate() + n);
  return c;
};

/**
 * Découpe la plage [firstDate..lastDate] en semaines (colonnes) × 7 jours (lignes,
 * dim→sam), façon graphe de contribution. Chaque cellule porte sa date, son compte
 * et son niveau. Réutilisé par le SVG (README) et, en miroir, par le front.
 */
export const MIN_WEEKS = 20;

export function buildWeeks(timeline, minWeeks = MIN_WEEKS) {
  if (!timeline.firstDate || !timeline.lastDate) return [];
  const first = new Date(`${timeline.firstDate}T00:00:00Z`);
  const last = new Date(`${timeline.lastDate}T00:00:00Z`);
  // Reculer au dimanche de la semaine du premier hook ; avancer au samedi du dernier.
  const start = addDays(first, -first.getUTCDay());
  let end = addDays(last, 6 - last.getUTCDay());
  // Garantir une largeur minimale : on étend vers le futur (cellules vides à droite)
  // → effet « room to grow », et un canevas lisible dès les premières semaines.
  // Déterministe (ne dépend que de first/last), donc stable pour `--check`.
  const weekCount = Math.floor((end.getTime() - start.getTime()) / (7 * 86400000)) + 1;
  if (weekCount < minWeeks) end = addDays(end, (minWeeks - weekCount) * 7);

  const weeks = [];
  let cursor = start;
  while (cursor.getTime() <= end.getTime()) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const iso = ISO(cursor);
      const count = timeline.byDay[iso] ?? 0;
      days.push({ date: iso, count, level: bucketLevel(count) });
      cursor = addDays(cursor, 1);
    }
    weeks.push(days);
  }
  return weeks;
}

// Rampe de luminance monochrome — du vide au blanc (la marque HookStack, #fff sur
// fond sombre). Fidèle au langage visuel monochrome du site. Doit rester identique
// à LEVEL_COLORS dans src/lib/timeline.ts.
const LEVEL_COLORS = ['#1c1c20', '#3f3f46', '#71717a', '#a1a1aa', '#f4f4f5'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Rend le heatmap en SVG autonome (embarqué dans le README via <img>). */
export function renderHeatmapSvg(timeline) {
  const weeks = buildWeeks(timeline);
  const CELL = 12, GAP = 3, STEP = CELL + GAP;
  const LEFT = 30, TOP = 20, BOTTOM = 34;
  const w = LEFT + weeks.length * STEP + 10;
  const h = TOP + 7 * STEP + BOTTOM;

  const cells = [];
  const monthLabels = [];
  let lastMonth = -1;

  weeks.forEach((days, wi) => {
    const firstOfWeek = new Date(`${days[0].date}T00:00:00Z`);
    const m = firstOfWeek.getUTCMonth();
    if (m !== lastMonth) {
      lastMonth = m;
      monthLabels.push(
        `<text x="${LEFT + wi * STEP}" y="${TOP - 7}" fill="#71717a" font-size="10">${MONTHS[m]}</text>`,
      );
    }
    days.forEach((day, di) => {
      const x = LEFT + wi * STEP;
      const y = TOP + di * STEP;
      const title = day.count
        ? `${day.date} — ${day.count} hook${day.count > 1 ? 's' : ''} added`
        : `${day.date} — no hooks`;
      cells.push(
        `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5" ` +
          `fill="${LEVEL_COLORS[day.level]}"><title>${title}</title></rect>`,
      );
    });
  });

  // Étiquettes de jours (Mon/Wed/Fri), comme GitHub.
  const dayLabels = [
    [1, 'Mon'],
    [3, 'Wed'],
    [5, 'Fri'],
  ]
    .map(
      ([di, label]) =>
        `<text x="${LEFT - 6}" y="${TOP + di * STEP + CELL - 2}" fill="#71717a" font-size="9" text-anchor="end">${label}</text>`,
    )
    .join('');

  // Légende « Less → More ».
  const legendY = TOP + 7 * STEP + 14;
  const legendX = Math.max(LEFT, w - 10 - 5 * (CELL - 2) - 4 * 3 - 70);
  const swatches = LEVEL_COLORS.map(
    (c, i) =>
      `<rect x="${legendX + 34 + i * (CELL - 1)}" y="${legendY - CELL + 4}" width="${CELL - 2}" height="${CELL - 2}" rx="2" fill="${c}"/>`,
  ).join('');
  const legend =
    `<text x="${legendX}" y="${legendY}" fill="#71717a" font-size="10">Less</text>` +
    swatches +
    `<text x="${legendX + 34 + 5 * (CELL - 1) + 4}" y="${legendY}" fill="#71717a" font-size="10">More</text>`;

  const title = `HookStack — ${timeline.total} hooks added since ${timeline.firstDate ?? 'day one'}`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ` +
    `font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif" role="img" aria-label="${title}">\n` +
    `  <rect width="${w}" height="${h}" fill="#0a0a0a"/>\n` +
    `  ${monthLabels.join('\n  ')}\n` +
    `  ${dayLabels}\n` +
    `  ${cells.join('\n  ')}\n` +
    `  ${legend}\n` +
    `</svg>\n`
  );
}

/** Construit le bloc README complet (marqueurs inclus). */
export function renderReadmeBlock(timeline) {
  const total = timeline.total;
  const span =
    timeline.firstDate && timeline.lastDate
      ? `First hook ${timeline.firstDate} · latest ${timeline.lastDate}`
      : 'The catalogue is just getting started';
  return [
    START_MARK,
    '',
    '## 📈 The stack grows in the open',
    '',
    `**${total} hooks** and counting — every one dogfooded on this repo, unit-tested, and shipped in public.`,
    '',
    '<p align="center">',
    `  <a href="${SITE}/evolution">`,
    `    <img src="public/hooks-timeline.svg" alt="HookStack growth — contribution-style heatmap of hooks added over time"/>`,
    '  </a>',
    '</p>',
    '',
    `<sub>${span} · explore the live timeline → <a href="${SITE}/evolution"><b>hookstack.app/evolution</b></a></sub>`,
    '',
    END_MARK,
  ].join('\n');
}

/**
 * Injecte/replace le bloc dans le README. Si les marqueurs existent → remplace
 * entre eux. Sinon → insère juste avant le premier titre « ## » (sous le hero).
 */
export function injectReadme(readme, block) {
  const startIdx = readme.indexOf(START_MARK);
  const endIdx = readme.indexOf(END_MARK);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = readme.slice(0, startIdx);
    const after = readme.slice(endIdx + END_MARK.length);
    return before + block + after;
  }
  // Première insertion : avant le premier "## " en début de ligne.
  const headingIdx = readme.search(/^## /m);
  if (headingIdx !== -1) {
    return readme.slice(0, headingIdx) + block + '\n\n' + readme.slice(headingIdx);
  }
  return readme.trimEnd() + '\n\n' + block + '\n';
}

/** Sérialisation déterministe de la timeline (clé d'écriture + comparaison `--check`). */
export function serializeTimeline(timeline) {
  return JSON.stringify(timeline, null, 2) + '\n';
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestration (effets de bord)
// ─────────────────────────────────────────────────────────────────────────────

export function generate(deps = defaultDeps) {
  const registry = deps.loadRegistry();
  const files = deps.listHookFiles();
  const entries = collectHooks({ files, registry, exec: deps.exec });
  const timeline = buildTimeline(entries);
  return {
    timeline,
    json: serializeTimeline(timeline),
    svg: renderHeatmapSvg(timeline),
    readmeBlock: renderReadmeBlock(timeline),
  };
}

/* v8 ignore start */
function main() {
  const DRY = process.argv.includes('--dry-run');
  const CHECK = process.argv.includes('--check');

  const { timeline, json, svg, readmeBlock } = generate();
  const readme = readFileSync(README_PATH, 'utf8');
  const nextReadme = injectReadme(readme, readmeBlock);

  console.log(`\nTimeline : ${timeline.total} hooks · ${timeline.firstDate} → ${timeline.lastDate}`);
  const days = Object.entries(timeline.byDay).sort();
  console.log(`  ${days.length} jour(s) d'activité, pic : ${Math.max(0, ...Object.values(timeline.byDay))} hooks/jour`);

  if (CHECK) {
    const drift = [];
    if (!existsSync(TIMELINE_PATH) || readFileSync(TIMELINE_PATH, 'utf8') !== json) drift.push('registry/hooks-timeline.json');
    if (!existsSync(SVG_PATH) || readFileSync(SVG_PATH, 'utf8') !== svg) drift.push('public/hooks-timeline.svg');
    if (readme !== nextReadme) drift.push('README.md (bloc HOOKS_TIMELINE)');
    if (drift.length) {
      console.error(`\n✗ ${drift.length} artefact(s) timeline désynchronisé(s) :`);
      drift.forEach((d) => console.error(`    - ${d}`));
      console.error("  Lancer 'pnpm timeline' (ou 'node .claude/hooks-timeline.mjs') puis committer.");
      process.exit(1);
    }
    console.log('\n✓ artefacts timeline synchrones.');
    process.exit(0);
  }

  if (DRY) {
    console.log('\n[dry-run] aucune écriture effectuée');
    return;
  }

  writeFileSync(TIMELINE_PATH, json, 'utf8');
  writeFileSync(SVG_PATH, svg, 'utf8');
  writeFileSync(README_PATH, nextReadme, 'utf8');
  console.log('\n✓ registry/hooks-timeline.json, public/hooks-timeline.svg et README.md mis à jour');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
/* v8 ignore stop */
