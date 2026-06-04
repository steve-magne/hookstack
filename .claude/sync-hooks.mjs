#!/usr/bin/env node
/**
 * sync-hooks.mjs — synchronise les scripts dogfoodés et le catalogue (registry.json)
 *
 * SOURCE DE VÉRITÉ DU CODE : les fichiers .claude/hooks/*.mjs
 * registry.json en DÉRIVE le champ implementation.code_snippet.
 *
 * Usage:
 *   node .claude/sync-hooks.mjs            # sync réelle : disque -> code_snippet + settings.json
 *   node .claude/sync-hooks.mjs --dry-run  # aperçu sans écriture
 *   node .claude/sync-hooks.mjs --check    # CI : exit 1 si dérive registre/disque (n'écrit rien)
 *
 * Règles :
 *   - Si le fichier .mjs existe : son contenu EST la vérité -> recopié dans code_snippet
 *   - Si le fichier .mjs est absent : on PRÉSERVE code_snippet (hook catalogue-only,
 *     ex. python exclus) et on peut le seeder depuis le snippet (bootstrap)
 *   - Reconstruit .claude/settings.json depuis les implementation.config du catalogue
 *   - Préserve la section "permissions" de l'ancien settings.json
 *
 * Pour modifier un hook : éditer le .mjs (le dogfooder, le tester), puis relancer ce script.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const CHECK = process.argv.includes('--check');

const REGISTRY_PATH = resolve(ROOT, 'registry/registry.json');
const SETTINGS_PATH = resolve(ROOT, '.claude/settings.json');

// Stacks à exclure : si tous les éléments sont dans cette liste, le hook est exclu
const EXCLUDED_STACKS = new Set(['python', 'java']);

// Slugs catalogue-only sur ce projet (remplacés par une alternative active)
// Ces hooks restent visibles dans le catalogue mais ne sont pas injectés dans settings.json
const EXCLUDED_SLUGS = new Set([
  'notification-tts-voice',   // remplacé par notification-sound
  'stop-tts-completion',      // remplacé par stop-sound
]);

function isExcluded(stack, slug) {
  if (EXCLUDED_SLUGS.has(slug)) return true;
  if (!stack || stack.length === 0) return false;
  return stack.every((s) => EXCLUDED_STACKS.has(s));
}

function loadJSON(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const registry = loadJSON(REGISTRY_PATH);
const existingSettings = loadJSON(SETTINGS_PATH);

// Filtrer les hooks éligibles à l'activation locale (settings.json)
const eligible = registry.filter((h) => !isExcluded(h.stack, h.slug));
const excluded = registry.filter((h) => isExcluded(h.stack, h.slug));

console.log(`\nRegistre : ${registry.length} hooks total`);
console.log(`  Éligibles : ${eligible.length}`);
const excludedByStack = excluded.filter((h) => !EXCLUDED_SLUGS.has(h.slug));
const excludedBySlug = excluded.filter((h) => EXCLUDED_SLUGS.has(h.slug));
console.log(`  Exclus (python/java only) : ${excludedByStack.length}`);
excludedByStack.forEach((h) => console.log(`    - ${h.slug} [${h.stack}]`));
if (excludedBySlug.length) {
  console.log(`  Exclus (remplacés localement) : ${excludedBySlug.length}`);
  excludedBySlug.forEach((h) => console.log(`    - ${h.slug}`));
}

// ── Étape 1 : DISQUE -> code_snippet (le fichier .mjs est la vérité) ─────────
//
// Pour chaque hook avec un script_path :
//   - fichier présent  -> on recopie son contenu dans code_snippet (disque gagne)
//   - fichier absent + code_snippet présent -> bootstrap : on seede le fichier
//   - fichier absent + pas de snippet -> on signale

console.log('\n── Scripts (disque -> registre) ──');
let updated = 0; // code_snippet mis à jour depuis le disque
let drift = 0; // divergences détectées (mode --check)
let seeded = 0; // fichiers .mjs créés depuis le snippet (bootstrap)
let unchanged = 0; // déjà synchrones
let noSnippet = 0; // ni fichier ni snippet

for (const hook of registry) {
  const rel = hook.implementation?.script_path;
  if (!rel) continue;

  const scriptPath = resolve(ROOT, rel);

  if (existsSync(scriptPath)) {
    // Le fichier est la source de vérité.
    const disk = readFileSync(scriptPath, 'utf8');
    const current = hook.implementation.code_snippet ?? '';
    if (disk === current) {
      unchanged++;
      continue;
    }
    drift++;
    if (CHECK) {
      console.log(`  ✗ dérive : ${hook.slug} (${rel})`);
    } else {
      hook.implementation.code_snippet = disk;
      console.log(`  ${DRY_RUN ? '[dry] ' : ''}↻ code_snippet mis à jour depuis disque : ${hook.slug}`);
      updated++;
    }
  } else if (hook.implementation?.code_snippet) {
    // Pas de fichier : hook catalogue-only (ex. python exclu) -> on préserve le snippet.
    // Bootstrap : seeder le fichier depuis le snippet (sauf stack exclue).
    if (isExcluded(hook.stack)) continue;
    if (!DRY_RUN && !CHECK) {
      writeFileSync(scriptPath, hook.implementation.code_snippet, 'utf8');
      seeded++;
    }
    console.log(`  ${DRY_RUN || CHECK ? '[dry] ' : ''}✓ seedé depuis snippet : ${rel}`);
  } else {
    console.warn(`  ⚠ ni fichier ni code_snippet : ${hook.slug}`);
    noSnippet++;
  }
}

console.log(
  `  ${unchanged} synchrone(s), ${updated} mis à jour, ${seeded} seedé(s)` +
    (drift ? `, ${drift} dérive(s)` : '') +
    (noSnippet ? `, ${noSnippet} sans source` : ''),
);

// ── Étape 1b : normaliser implementation.config.hooks[].command ─────────────
// Le CLI (hookstack-cli) lit ces champs directement depuis le registre.
// On s'assure que chaque commande est de la forme "node $CLAUDE_PROJECT_DIR/..."
// pour éviter les commandes malformées (ex. "node bash ..." héritées de l'ère .sh).

const BAD_CMD_RE = /^(node\s+bash|bash\s+bash|bash\s+node)\b/;
let cmdDrift = 0;
let cmdFixed = 0;

for (const hook of registry) {
  const rel = hook.implementation?.script_path;
  const config = hook.implementation?.config;
  if (!rel || !config?.hooks) continue;

  const expectedCmd = `node $CLAUDE_PROJECT_DIR/.claude/hooks/${basename(rel)}`;

  for (const entries of Object.values(config.hooks)) {
    for (const group of entries) {
      for (const entry of group.hooks ?? []) {
        if (typeof entry.command !== 'string') continue;
        if (BAD_CMD_RE.test(entry.command)) {
          cmdDrift++;
          if (CHECK) {
            console.error(`  ✗ commande malformée : ${hook.slug} → "${entry.command}"`);
          } else {
            entry.command = expectedCmd;
            cmdFixed++;
          }
        }
      }
    }
  }
}

if (cmdDrift > 0 && !CHECK) {
  console.log(`  ${DRY_RUN ? '[dry] ' : ''}↻ ${cmdFixed} commande(s) normalisée(s) dans implementation.config`);
}

// ── Étape 2 : reconstruire settings.json depuis implementation.config ────────
// (inchangé — cette moitié fonctionne déjà)

// Structure intermédiaire : hooksMap[event][matcher] = [ hookEntry, ... ]
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
events.forEach((evt) => {
  const total = newHooks[evt].reduce((acc, g) => acc + g.hooks.length, 0);
  console.log(`  ${evt} : ${total} hook(s)`);
});

// ── Mode --check : pas d'écriture, exit selon dérive ─────────────────────────
if (CHECK) {
  const totalDrift = drift + cmdDrift;
  if (totalDrift > 0) {
    if (drift > 0) {
      console.error(`\n✗ ${drift} dérive(s) entre registry.json et les .mjs sur disque.`);
    }
    if (cmdDrift > 0) {
      console.error(`\n✗ ${cmdDrift} commande(s) malformée(s) dans implementation.config (ex. "node bash …").`);
    }
    console.error("  Lancer 'node .claude/sync-hooks.mjs' pour resynchroniser.");
    process.exit(1);
  }
  console.log('\n✓ registry.json synchrone avec les scripts disque.');
  process.exit(0);
}

// ── Écritures ────────────────────────────────────────────────────────────────
if (!DRY_RUN) {
  if (updated > 0 || cmdFixed > 0) {
    writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n', 'utf8');
    const parts = [];
    if (updated > 0) parts.push(`${updated} code_snippet`);
    if (cmdFixed > 0) parts.push(`${cmdFixed} commande(s) normalisée(s)`);
    console.log(`\n✓ registry.json mis à jour (${parts.join(', ')})`);
  }
  writeFileSync(SETTINGS_PATH, JSON.stringify(newSettings, null, 2) + '\n', 'utf8');
  console.log('✓ .claude/settings.json mis à jour');
} else {
  console.log('\n[dry-run] aucune écriture effectuée');
}
