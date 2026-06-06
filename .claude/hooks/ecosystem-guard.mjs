#!/usr/bin/env node
// Rappel de propagation cross-fichiers après édition d'un fichier stratégique (PostToolUse Write|Edit).
// Lit la carte d'impact depuis `.claude/ecosystem-map.json` — créer ce fichier dans votre projet.
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

function loadMap(projectDir, readFile = readFileSync, exists = existsSync) {
  const mapPath = join(projectDir, '.claude', 'ecosystem-map.json');
  if (!exists(mapPath)) return null;
  try {
    return JSON.parse(readFile(mapPath, 'utf8'));
  } catch {
    return null;
  }
}

export function run(input, {
  projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
  readFile = readFileSync,
  exists = existsSync,
} = {}) {
  const filePath = input.tool_input?.file_path ?? '';
  if (!filePath) return null;

  const map = loadMap(projectDir, readFile, exists);
  if (!map || map.length === 0) return null;

  // Rendre le chemin relatif au répertoire projet
  const rel = filePath.startsWith(projectDir + '/')
    ? filePath.slice(projectDir.length + 1)
    : filePath;

  const impact = map.find((g) =>
    (g.matches ?? []).some((m) => rel === m || rel.startsWith(m)),
  );
  if (!impact) return null;

  const checkList = (impact.check ?? []).map((f) => `  - ${f}`).join('\n');
  const message = [
    `⚠️  ECOSYSTEM GUARD — fichier stratégique modifié : ${rel} (${impact.label ?? ''})`,
    impact.tip ?? '',
    `Fichiers à vérifier pour cohérence :`,
    checkList,
    `Vérification rapide : node .claude/ecosystem-check.mjs`,
  ].filter(Boolean).join('\n');

  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: message,
    },
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
