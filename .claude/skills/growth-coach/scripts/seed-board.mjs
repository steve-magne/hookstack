#!/usr/bin/env node
// Pose le board de croissance sur GitHub Issues : labels + issues de fondation.
// Idempotent : ne recrée pas un label/issue qui existe déjà (match par nom/titre).
// Usage : node seed-board.mjs [--dry-run]
// Aucune dépendance externe. Requiert `gh` authentifié.

import { execSync } from 'node:child_process';

const REPO = 'steve-magne/hookstack';
const DRY = process.argv.includes('--dry-run');

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', timeout: 30000, ...opts }).trim();
}
function shQuiet(cmd, opts = {}) {
  try { return sh(cmd, opts); } catch { return ''; }
}

const LABELS = [
  ['growth', '0E8A16', 'Croissance / acquisition (parapluie)'],
  ['content', '1D76DB', 'Création de contenu (X, LinkedIn, blog)'],
  ['outreach', '5319E7', 'Contact ciblé : repos, threads, newsletters'],
  ['spike', 'B60205', 'Événement de pic : Show HN, Reddit, viral'],
  ['seo', 'FBCA04', 'Découvrabilité : README, topics, OG image, docs'],
  ['idea', 'C5DEF5', 'Idée à qualifier / backlog'],
];

// Issues de fondation = phases 0 et 1 du playbook. Titre sert de clé d'idempotence.
const ISSUES = [
  ['[Foundation] README hero : GIF de démo + CTA star + quickstart', ['growth', 'seo'],
    'Le README doit convertir en 5 secondes. Ajouter : GIF de démo (sélection → `npx` → install en 30s), proposition de valeur claire, badge stars, CTA « ⭐ Star if useful », bloc Quickstart avec `npx hookstack-cli@latest install`.\n\nDone = un visiteur froid comprend la valeur et sait quoi faire sans scroller.\n\nRéf : doc/hookstack/growth/playbook.md (Phase 0).'],
  ['[Foundation] Social preview image du repo (Settings → Social preview)', ['growth', 'seo'],
    "Image affichée quand le repo est partagé sur X/LinkedIn/Slack. Sans elle, les partages sont fades. Réutiliser l'OG image du site.\n\nRéf : Phase 0."],
  ['[Foundation] OG image + meta description du site', ['growth', 'seo'],
    'hookstack.vercel.app doit avoir une OG image et une meta description soignées pour le partage social. Vérifier aussi que les events GA4 marketing tournent.\n\nRéf : Phase 0.'],
  ['[Foundation] Message post-install du CLI avec lien repo + CTA star', ['growth', 'content'],
    "Le CLI (`packages/cli`) doit afficher après install : `✅ hooks installed · star us → github.com/steve-magne/hookstack`. C'est le moteur de la boucle virale (chaque install = un partage potentiel).\n\nRéf : Phase 0 + 07-strategie-marketing.md, Canal 1."],
  ['[Seed] Cornerstone : article « The 5 Claude Code hooks I run on every project »', ['growth', 'content'],
    "Article de fond (dev.to + blog) avec GIF de démo et lien repo. C'est l'actif maître qu'on atomise ensuite en threads/posts. Utiliser /growth-post.\n\nRéf : Phase 1."],
  ['[Seed] Réseau perso : post LinkedIn de lancement + 10-20 DM', ['growth', 'content'],
    'Amorcer les 30-50 premières stars (preuve sociale). Post LinkedIn « pourquoi j\'ai construit ça » + DM ciblés à des devs Claude Code. Utiliser /growth-post (canal LinkedIn).\n\nRéf : Phase 1.'],
  ['[Seed] Soft-launch value-first sur r/ClaudeAI + Discord Anthropic', ['growth', 'spike'],
    "Partage genuine (pas « regardez mon site »). Lire les règles anti-spam. Être présent dans les commentaires.\n\nRéf : Phase 1 + doc/hookstack/growth/channels.md."],
  ['[Ops] Boucle growth hebdo : /growth-coach lundi, /growth-coach review vendredi', ['growth'],
    'Rituel récurrent. Lundi : diagnostic + 1-3 priorités. Vendredi : bilan, log des chiffres, ajustement. Voir doc/hookstack/growth/README.md (la boucle hebdomadaire).'],
];

function ensureLabels() {
  const existing = new Set(
    shQuiet(`gh label list --repo ${REPO} --limit 100 --json name --jq ".[].name"`).split('\n').filter(Boolean)
  );
  for (const [name, color, desc] of LABELS) {
    if (existing.has(name)) { console.log(`  label ✓ ${name} (existe)`); continue; }
    if (DRY) { console.log(`  label + ${name} (dry-run)`); continue; }
    shQuiet(`gh label create "${name}" --repo ${REPO} --color ${color} --description "${desc}"`);
    console.log(`  label + ${name}`);
  }
}

function ensureIssues() {
  const open = shQuiet(`gh issue list --repo ${REPO} --state all --limit 200 --json title --jq ".[].title"`)
    .split('\n').filter(Boolean);
  const has = (title) => open.includes(title);
  for (const [title, labels, body] of ISSUES) {
    if (has(title)) { console.log(`  issue ✓ ${title.slice(0, 50)}… (existe)`); continue; }
    if (DRY) { console.log(`  issue + ${title.slice(0, 50)}… (dry-run)`); continue; }
    const labelArgs = labels.map((l) => `--label "${l}"`).join(' ');
    // Body via stdin (--body-file -) : évite toute interprétation shell des
    // backticks / $ / guillemets dans le corps de l'issue.
    const safeTitle = title.replace(/"/g, '\\"');
    shQuiet(`gh issue create --repo ${REPO} --title "${safeTitle}" ${labelArgs} --body-file -`, { input: body });
    console.log(`  issue + ${title.slice(0, 50)}…`);
  }
}

console.log(`\n🌱 Seed growth board → ${REPO}${DRY ? ' (dry-run)' : ''}\n`);
console.log('Labels :');
ensureLabels();
console.log('\nIssues de fondation :');
ensureIssues();
console.log('\nDone. Board : https://github.com/' + REPO + '/issues?q=is%3Aissue+label%3Agrowth\n');
