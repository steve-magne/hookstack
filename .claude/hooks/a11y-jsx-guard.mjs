#!/usr/bin/env node
// @hookstack a11y-jsx-guard
// Garde d'accessibilité JSX sur les composants src/**/*.tsx|jsx (PostToolUse Write|Edit).
// Progressive enhancement :
//   • eslint-plugin-jsx-a11y installé → ESLint v8/v9 (12 règles WCAG, config temp /tmp/)
//   • plugin absent               → vérifications statiques (4 règles regex, zéro dépendance)
// Non bloquant : cumule les violations dans un message.
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';

// ── Chemin ESLint ──────────────────────────────────────────────────────────────

const A11Y_RULES = {
  'jsx-a11y/alt-text': 'error',
  'jsx-a11y/aria-props': 'error',
  'jsx-a11y/aria-proptypes': 'error',
  'jsx-a11y/aria-role': 'error',
  'jsx-a11y/aria-unsupported-elements': 'error',
  'jsx-a11y/click-events-have-key-events': 'warn',
  'jsx-a11y/heading-has-content': 'error',
  'jsx-a11y/interactive-supports-focus': 'warn',
  'jsx-a11y/label-has-associated-control': 'warn',
  'jsx-a11y/no-positive-tabindex': 'error',
  'jsx-a11y/role-has-required-aria-props': 'error',
  'jsx-a11y/role-supports-aria-props': 'error',
};

function defaultExec(cmd) {
  return execSync(cmd, { stdio: 'pipe', timeout: 20_000, encoding: 'utf8' });
}

function defaultUnlink(p) {
  try { unlinkSync(p); } catch { /* silencieux */ }
}

function runEslint(filePath, { exec, writeFile, unlink, readFile, projectDir }) {
  let eslintMajor;
  try {
    const pkg = JSON.parse(readFile(join(projectDir, 'node_modules/eslint/package.json'), 'utf8'));
    eslintMajor = parseInt(pkg.version.split('.')[0], 10);
  } catch {
    return null;
  }

  const ext = eslintMajor >= 9 ? 'mjs' : 'json';
  const configPath = `/tmp/hookstack-a11y-${process.pid}.${ext}`;

  if (eslintMajor >= 9) {
    const pluginPath = join(projectDir, 'node_modules/eslint-plugin-jsx-a11y/index.js');
    const rulesStr = Object.entries(A11Y_RULES)
      .map(([k, v]) => `    '${k}': '${v}'`).join(',\n');
    writeFile(
      configPath,
      `import plugin from '${pluginPath}';\n` +
      `export default [{ plugins: { 'jsx-a11y': plugin }, rules: {\n${rulesStr}\n} }];\n`,
    );
  } else {
    writeFile(configPath, JSON.stringify({
      plugins: ['jsx-a11y'],
      rules: A11Y_RULES,
      parserOptions: { ecmaVersion: 2020, sourceType: 'module', ecmaFeatures: { jsx: true } },
    }));
  }

  try {
    const configFlag = eslintMajor >= 9
      ? `--no-config-lookup --config "${configPath}"`
      : `--no-eslintrc -c "${configPath}" --resolve-plugins-relative-to "${projectDir}"`;
    exec(`npx --no-install eslint ${configFlag} --format json "${filePath}"`);
    return null;
  } catch (err) {
    const raw = err.stdout?.toString() ?? '';
    let results;
    try { results = JSON.parse(raw); } catch { return null; }

    const msgs = results
      .flatMap((r) => r.messages ?? [])
      .filter((m) => m.ruleId?.startsWith('jsx-a11y/'));
    if (!msgs.length) return null;

    return {
      message:
        `[a11y] ${filePath.split('/').pop()} accessibility violations:\n` +
        msgs.map((m) =>
          `  ${m.severity === 2 ? '✗' : '⚠'} ${m.ruleId}: ${m.message} (line ${m.line})`,
        ).join('\n') + '\n',
    };
  } finally {
    unlink(configPath);
  }
}

// ── Chemin statique (fallback zéro-dépendance) ────────────────────────────────
//
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

const STATIC_CHECKS = [
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

function runStatic(filePath, { readFile }) {
  let content;
  try {
    content = readFile(filePath, 'utf8');
  } catch {
    return null;
  }
  const violations = STATIC_CHECKS.map((check) => check(content)).filter(Boolean);
  if (!violations.length) return null;
  return {
    message:
      `[a11y] ${filePath} has accessibility issues:\n` +
      violations.map((v) => `  - ${v}`).join('\n') +
      '\n',
  };
}

// ── Point d'entrée ─────────────────────────────────────────────────────────────

export function run(input, {
  exec = defaultExec,
  exists = existsSync,
  writeFile = writeFileSync,
  unlink = defaultUnlink,
  readFile = readFileSync,
  projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
} = {}) {
  const filePath = input.tool_input?.file_path ?? '';
  if (!/\/src\/.*\.[jt]sx$/.test(filePath)) return null;

  if (exists(join(projectDir, 'node_modules/eslint-plugin-jsx-a11y'))) {
    return runEslint(filePath, { exec, writeFile, unlink, readFile, projectDir });
  }

  return runStatic(filePath, { readFile });
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result?.message) process.stderr.write(result.message);
}
