#!/usr/bin/env node
/**
 * Vérifie la cohérence des fichiers stratégiques de l'écosystème Hookstack.
 * Usage : node .claude/ecosystem-check.mjs
 * Exit 0 = OK, Exit 1 = incohérences détectées.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  const p = resolve(ROOT, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

// Invariants : chaque `contains` doit être présent dans le fichier indiqué.
// Ajouter ici toute chaîne qui doit rester cohérente entre les surfaces.
const CHECKS = [
  {
    file: 'README.md',
    invariants: [
      { contains: 'hookstack.vercel.app', label: 'URL de production dans README.md' },
      { contains: 'npx hookstack-cli@latest', label: 'Commande npx dans README.md' },
    ],
  },
  {
    file: 'packages/cli/README.md',
    invariants: [
      { contains: 'hookstack.vercel.app', label: 'URL de production dans packages/cli/README.md' },
      { contains: 'npx hookstack-cli@latest', label: 'Commande npx dans packages/cli/README.md' },
    ],
  },
  {
    file: 'src/lib/i18n.ts',
    invariants: [
      // Le nom hookstack-cli est construit dans HookConfigurator.tsx — i18n.ts contient le label autour.
      { contains: 'npx', label: 'Référence npx dans i18n.ts (label autour de la commande install)' },
      { contains: 'HookStack', label: 'Marque HookStack présente dans i18n.ts' },
    ],
  },
];

let failures = 0;
let passes = 0;

for (const { file, invariants } of CHECKS) {
  const content = read(file);
  if (!content) {
    console.log(`⚠  ${file} : fichier absent`);
    continue;
  }
  for (const { contains, label } of invariants) {
    if (content.includes(contains)) {
      console.log(`✓  ${label}`);
      passes++;
    } else {
      console.log(`✗  ${label}`);
      console.log(`   Attendu : "${contains}" dans ${file}`);
      failures++;
    }
  }
}

console.log(`\n${passes + failures} vérification(s) : ${passes} ✓  ${failures} ✗`);
if (failures > 0) {
  console.error(`\n⚠  ${failures} incohérence(s) — vérifier la propagation entre fichiers stratégiques.`);
  process.exit(1);
}
