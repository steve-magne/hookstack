#!/usr/bin/env node
/**
 * sync-hooks.mjs — synchronise le catalogue (registry.json) vers ce projet
 *
 * Usage:
 *   node .claude/sync-hooks.mjs            # sync réelle
 *   node .claude/sync-hooks.mjs --dry-run  # aperçu sans écriture
 *
 * Règles :
 *   - Exclut les hooks dont la stack est exclusivement python/java
 *   - Crée les scripts .mjs manquants dans .claude/hooks/ depuis code_snippet
 *   - NE réécrit PAS les scripts existants (pour ne pas écraser les ajustements)
 *   - Reconstruit .claude/settings.json depuis les configs du catalogue
 *   - Préserve la section "permissions" de l'ancien settings.json
 *
 * Source de vérité : registry/registry.json
 * Pour modifier un hook, éditer le registre puis relancer ce script.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

const REGISTRY_PATH = resolve(ROOT, 'registry/registry.json');
const SETTINGS_PATH = resolve(ROOT, '.claude/settings.json');
const HOOKS_DIR = resolve(ROOT, '.claude/hooks');

// Stacks à exclure : si tous les éléments sont dans cette liste, le hook est exclu
const EXCLUDED_STACKS = new Set(['python', 'java']);

function isExcluded(stack) {
  if (!stack || stack.length === 0) return false;
  return stack.every(s => EXCLUDED_STACKS.has(s));
}

function loadJSON(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const registry = loadJSON(REGISTRY_PATH);
const existingSettings = loadJSON(SETTINGS_PATH);

// Filtrer les hooks éligibles
const eligible = registry.filter(h => !isExcluded(h.stack));
const excluded = registry.filter(h => isExcluded(h.stack));

console.log(`\nRegistre : ${registry.length} hooks total`);
console.log(`  Éligibles : ${eligible.length}`);
console.log(`  Exclus (python/java only) : ${excluded.length}`);
excluded.forEach(h => console.log(`    - ${h.slug} [${h.stack}]`));

// ── Étape 1 : créer les scripts manquants ──────────────────────────────────

console.log('\n── Scripts ──');
let created = 0;
let skipped = 0;
let noSnippet = 0;

for (const hook of eligible) {
  const rel = hook.implementation?.script_path;
  if (!rel) continue;

  const scriptPath = resolve(ROOT, rel);
  if (existsSync(scriptPath)) {
    skipped++;
    continue;
  }

  const code = hook.implementation?.code_snippet;
  if (!code) {
    console.warn(`  ⚠ Pas de code_snippet : ${hook.slug}`);
    noSnippet++;
    continue;
  }

  if (!DRY_RUN) {
    writeFileSync(scriptPath, code, 'utf8');
  }
  console.log(`  ${DRY_RUN ? '[dry] ' : ''}✓ créé : ${rel}`);
  created++;
}

console.log(`  ${created} créé(s), ${skipped} déjà présent(s)${noSnippet ? `, ${noSnippet} sans snippet` : ''}`);

// ── Étape 2 : reconstruire settings.json ──────────────────────────────────

// Structure intermédiaire : hooksMap[event][matcher] = [ hookEntry, ... ]
// L'ordre des hooks dans chaque groupe suit l'ordre du registre.
const hooksMap = {};

for (const hook of eligible) {
  const event = hook.hook_type;
  const config = hook.implementation?.config;
  if (!config?.hooks?.[event]) continue;

  for (const group of config.hooks[event]) {
    const matcher = group.matcher ?? '';

    if (!hooksMap[event]) hooksMap[event] = {};
    if (!hooksMap[event][matcher]) hooksMap[event][matcher] = [];

    for (const entry of group.hooks ?? []) {
      // Toujours reconstruire la commande depuis script_path (source fiable)
      const scriptBase = basename(hook.implementation.script_path);
      const command = `node $CLAUDE_PROJECT_DIR/.claude/hooks/${scriptBase}`;

      const hookEntry = { type: 'command', command };

      // Conserver les options additionnelles si définies dans le registre
      if (entry.timeout !== undefined) hookEntry.timeout = entry.timeout;
      if (entry.async !== undefined) hookEntry.async = entry.async;
      if (entry.statusMessage !== undefined) hookEntry.statusMessage = entry.statusMessage;

      hooksMap[event][matcher].push(hookEntry);
    }
  }
}

// Convertir la map en format settings.json
const newHooks = {};
for (const [event, matchers] of Object.entries(hooksMap)) {
  newHooks[event] = [];
  for (const [matcher, hooks] of Object.entries(matchers)) {
    const group = { hooks };
    if (matcher) group.matcher = matcher;
    newHooks[event].push(group);
  }
}

const newSettings = {
  permissions: existingSettings.permissions ?? {},
  hooks: newHooks,
};

console.log('\n── settings.json ──');
const events = Object.keys(newHooks);
events.forEach(evt => {
  const total = newHooks[evt].reduce((acc, g) => acc + g.hooks.length, 0);
  console.log(`  ${evt} : ${total} hook(s)`);
});

if (!DRY_RUN) {
  writeFileSync(SETTINGS_PATH, JSON.stringify(newSettings, null, 2) + '\n', 'utf8');
  console.log('\n✓ .claude/settings.json mis à jour');
} else {
  console.log('\n[dry-run] aucune écriture effectuée');
}
