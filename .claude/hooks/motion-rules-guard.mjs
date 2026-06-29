#!/usr/bin/env node
// @hookstack motion-rules-guard
// Fait respecter les règles motion du projet après écriture d'un composant
// (PostToolUse Write|Edit). Règles vérifiées (cf. DESIGN.md / CLAUDE.md) :
//   - import depuis 'framer-motion' interdit → utiliser 'motion/react'
//   - éléments motion.* interdits (LazyMotion strict) → utiliser m.*
//   - pas de media query prefers-reduced-motion manuelle (MotionConfig la gère)
//   - jamais d'animation brute de width/height/top/left (transform/opacity only)
// Non bloquant : signale les violations avec la correction attendue.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RULES = [
  [/from\s+['"]framer-motion['"]/, "import 'framer-motion' → use 'motion/react' (paquet `motion`)"],
  [/<motion\.\w+/, '<motion.*> crashes under LazyMotion strict → use <m.*> (import { m } from "motion/react")'],
  [/prefers-reduced-motion/, 'manual prefers-reduced-motion query → remove it, MotionConfig reducedMotion="user" handles it globally'],
  [/animate=\{\{[^}]*\b(?:width|height|top|left)\s*:/s, 'animating width/height/top/left → use transform (x, y, scale) or the `layout` prop'],
];

export function run(input, { readFile = readFileSync } = {}) {
  const filePath = input.tool_input?.file_path ?? '';
  if (!/\/src\/.*\.[jt]sx?$/.test(filePath)) return null;

  let content;
  try {
    content = readFile(filePath, 'utf8');
  } catch {
    return null; // fichier illisible/supprimé → rien à vérifier
  }

  const violations = RULES.filter(([pattern]) => pattern.test(content)).map(([, fix]) => fix);
  if (!violations.length) return null;

  return {
    message:
      `[motion-rules] ${filePath} violates the project motion rules:\n` +
      violations.map((v) => `  - ${v}`).join('\n') +
      '\n→ See CLAUDE.md "Motion / Animations" and src/lib/motion.ts.\n',
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result?.message) process.stderr.write(result.message);
}
