#!/usr/bin/env node
// @hookstack post-edit-visual-check
// Rappelle de vérifier le rendu UI après l'édition d'un fichier front-end
// (PostToolUse Write|Edit). Détecte le type de fichier par extension — styles
// (css/scss…), markup (html), composants (tsx/jsx/vue/svelte/astro) — et injecte
// un additionalContext demandant à l'agent de constater le rendu dans le
// navigateur (preview/screenshot) plutôt que de supposer que ça marche.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Famille de fichiers front-end → libellé du type de changement à vérifier.
const FRONTEND_KINDS = [
  { re: /\.(css|scss|sass|less|styl|pcss)$/i, kind: 'styles' },
  { re: /\.(html?|svelte|vue|astro)$/i, kind: 'markup/component' },
  { re: /\.[jt]sx$/i, kind: 'component' },
];

export function run(input) {
  const filePath = input.tool_input?.file_path ?? '';
  const match = FRONTEND_KINDS.find(({ re }) => re.test(filePath));
  if (!match) return null;

  const name = filePath.split('/').pop();
  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext:
        `You edited a front-end file (${name} — ${match.kind}). ` +
        'Before considering this done, verify the change actually renders correctly in the browser: ' +
        'load it in the preview and inspect it (snapshot/screenshot, check the console for errors, ' +
        'and test the affected interaction/responsive state). ' +
        'Do not assume the UI looks right from the diff alone — look at it.',
    },
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
