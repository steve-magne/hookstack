#!/usr/bin/env node
// Rappel de propagation cross-fichiers après édition d'un fichier stratégique (PostToolUse Write|Edit)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// Carte d'impact : fichier stratégique → fichiers à vérifier pour cohérence.
// Adapter les entrées `matches` à la structure de votre projet.
const IMPACT_MAP = [
  {
    matches: ['src/lib/i18n.ts'],
    label: 'UI copy / taglines du site',
    check: ['README.md', 'packages/cli/README.md'],
    tip: 'Si le pitch ou les taglines ont changé → propager vers README.md et packages/cli/README.md',
  },
  {
    matches: ['README.md'],
    label: 'README projet (GitHub)',
    check: ['packages/cli/README.md', 'src/lib/i18n.ts'],
    tip: 'README GitHub modifié → vérifier la cohérence avec packages/cli/README.md et src/lib/i18n.ts',
  },
  {
    matches: ['packages/cli/README.md'],
    label: 'CLI README (npm)',
    check: ['README.md', 'src/lib/i18n.ts'],
    tip: 'README npm modifié → vérifier la cohérence avec README.md et le copy du site (i18n.ts)',
  },
  {
    matches: ['doc/hookstack/'],
    label: 'vision / stratégie produit',
    check: ['src/lib/i18n.ts', 'README.md', 'packages/cli/README.md'],
    tip: 'Doc stratégique modifiée → propager vers le copy du site (i18n.ts), README.md et CLI README si nécessaire',
  },
  {
    matches: ['DESIGN.md'],
    label: 'système de design',
    check: ['doc/hookstack/05-ux.md'],
    tip: 'Design system modifié → mettre à jour doc/hookstack/05-ux.md si la décision est pérenne',
  },
];

export function run(input, { projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd() } = {}) {
  const filePath = input.tool_input?.file_path ?? '';
  if (!filePath) return null;

  // Rendre le chemin relatif au répertoire projet
  const rel = filePath.startsWith(projectDir + '/')
    ? filePath.slice(projectDir.length + 1)
    : filePath;

  const impact = IMPACT_MAP.find((g) =>
    g.matches.some((m) => rel === m || rel.startsWith(m)),
  );
  if (!impact) return null;

  const checkList = impact.check.map((f) => `  - ${f}`).join('\n');
  const message = [
    `⚠️  ECOSYSTEM GUARD — fichier stratégique modifié : ${rel} (${impact.label})`,
    impact.tip,
    `Fichiers à vérifier pour cohérence :`,
    checkList,
    `Vérification rapide : node .claude/ecosystem-check.mjs`,
  ].join('\n');

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
