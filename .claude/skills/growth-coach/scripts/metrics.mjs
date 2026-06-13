#!/usr/bin/env node
// Snapshot des métriques de croissance Hookstack.
// Capture stars (gh) + downloads npm (API publique) + soumissions (issues),
// append une ligne NDJSON au log, et affiche un résumé.
// Aucune dépendance externe, aucun coût. Builtins Node uniquement.

import { execSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const REPO = 'steve-magne/hookstack';
const NPM_PKG = 'hookstack-cli';
// Log dans le repo privé hookstack-marketing (hors repo public)
const LOG = '/Users/stevemagne/workspace/hookstack-marketing/growth/metrics.log.ndjson';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

async function fetchNpmWeekly(pkg) {
  try {
    const res = await fetch(`https://api.npmjs.org/downloads/point/last-week/${pkg}`);
    if (!res.ok) return null;
    const json = await res.json();
    return typeof json.downloads === 'number' ? json.downloads : null;
  } catch {
    return null;
  }
}

function ghStars(repo) {
  try {
    return Number(sh(`gh api repos/${repo} --jq .stargazers_count`));
  } catch {
    return null;
  }
}

function ghIssueCount(repo, query) {
  try {
    const out = sh(`gh issue list --repo ${repo} ${query} --limit 200 --json number --jq "length"`);
    return Number(out);
  } catch {
    return null;
  }
}

function todayUTC() {
  // Date réelle OK ici (script Node standard, hors Workflow).
  return new Date().toISOString().slice(0, 10);
}

function lastSnapshot() {
  if (!existsSync(LOG)) return null;
  const lines = readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean);
  if (!lines.length) return null;
  try { return JSON.parse(lines[lines.length - 1]); } catch { return null; }
}

const prev = lastSnapshot();

const snapshot = {
  date: todayUTC(),
  stars: ghStars(REPO),
  npmWeekly: await fetchNpmWeekly(NPM_PKG),
  submissions: ghIssueCount(REPO, '--label repo-submission --state all'),
  openGrowthIssues: ghIssueCount(REPO, '--label growth --state open'),
};

appendFileSync(LOG, JSON.stringify(snapshot) + '\n');

function delta(key) {
  if (!prev || prev[key] == null || snapshot[key] == null) return '';
  const d = snapshot[key] - prev[key];
  return d === 0 ? ' (=)' : d > 0 ? ` (+${d})` : ` (${d})`;
}

const f = (v) => (v == null ? 'n/a' : String(v));
console.log(`\n📊 Hookstack growth — ${snapshot.date}`);
console.log('─'.repeat(40));
console.log(`⭐ GitHub stars        ${f(snapshot.stars)}${delta('stars')}`);
console.log(`📦 npm downloads (7j)  ${f(snapshot.npmWeekly)}${delta('npmWeekly')}`);
console.log(`📥 repo submissions    ${f(snapshot.submissions)}${delta('submissions')}`);
console.log(`📋 growth issues open  ${f(snapshot.openGrowthIssues)}${delta('openGrowthIssues')}`);
console.log('─'.repeat(40));
console.log(`Logged → ${LOG}`);
if (prev) console.log(`(delta vs ${prev.date})`);
console.log('');
