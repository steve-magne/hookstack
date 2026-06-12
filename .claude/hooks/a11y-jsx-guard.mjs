#!/usr/bin/env node
// Garde d'accessibilité statique sur les composants (PostToolUse Write|Edit).
// Cible : src/**/*.tsx. Quatre règles à faible faux-positif, sans ESLint ni AST :
//   - <Image> (next/image) sans `alt`            → image non décrite
//   - tabIndex positif                            → casse l'ordre de tabulation
//   - <a target="_blank"> sans rel noopener       → sécurité + bonne pratique
//   - onClick sur div/span/li sans role ni clavier → contrôle inaccessible au clavier
// Non bloquant : cumule les violations dans un seul message.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// Extrait chaque balise ouvrante d'un type donné, du `<tag` jusqu'au `>` de fermeture
// au niveau 0. On suit la profondeur des accolades et on saute les chaînes : ainsi un
// `>` issu d'une fonction fléchée `() =>` dans une prop, ou d'un `>` dans une string,
// ne tronque pas la balise (sinon role=/onKeyDown placés après seraient ignorés).
function openingTags(content, tag) {
  const tags = [];
  const re = new RegExp(`<${tag}\\b`, 'g');
  let m;
  while ((m = re.exec(content))) {
    let depth = 0;
    let quote = null;
    for (let j = m.index; j < content.length; j++) {
      const ch = content[j];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch;
      } else if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
      } else if (ch === '>' && depth === 0) {
        tags.push(content.slice(m.index, j + 1));
        break;
      }
    }
  }
  return tags;
}

const CHECKS = [
  (c) =>
    openingTags(c, 'Image').some((t) => !/\balt\s*=/.test(t))
      ? '<Image> without an `alt` prop → describe the image (alt="" only if purely decorative)'
      : null,
  (c) =>
    /\btabIndex=\{?\s*['"]?[1-9]\d*/.test(c)
      ? 'positive tabIndex → breaks natural tab order; use tabIndex={0} or restructure the DOM'
      : null,
  (c) =>
    openingTags(c, 'a').some(
      (t) => /target=['"]_blank['"]/.test(t) && !/\brel=['"][^'"]*noopener/.test(t),
    )
      ? 'target="_blank" without rel="noopener noreferrer" → security + SEO best practice'
      : null,
  (c) =>
    ['div', 'span', 'li'].some((tag) =>
      openingTags(c, tag).some(
        (t) => /\bonClick=/.test(t) && !/\brole=/.test(t) && !/\bonKey(?:Down|Press|Up)=/.test(t),
      ),
    )
      ? 'onClick on a non-interactive element (div/span/li) without role + keyboard handler → use <button>, or add role and onKeyDown'
      : null,
];

export function run(input, { readFile = readFileSync } = {}) {
  const filePath = input.tool_input?.file_path ?? '';
  if (!/\/src\/.*\.tsx$/.test(filePath)) return null;

  let content;
  try {
    content = readFile(filePath, 'utf8');
  } catch {
    return null;
  }

  const violations = CHECKS.map((check) => check(content)).filter(Boolean);
  if (!violations.length) return null;

  return {
    message:
      `[a11y] ${filePath} has accessibility issues:\n` +
      violations.map((v) => `  - ${v}`).join('\n') +
      '\n',
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result?.message) process.stderr.write(result.message);
}
