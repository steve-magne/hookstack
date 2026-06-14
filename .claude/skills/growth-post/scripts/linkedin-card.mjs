/**
 * Génère une image card LinkedIn (HTML 1080×1080) depuis des données JSON en stdin.
 *
 * Usage :
 *   echo '{"accroche":"...","bullets":[...],"command":"..."}' | node linkedin-card.mjs > card.html
 *
 * Champs attendus :
 *   accroche  string   Titre principal (peut contenir \n pour sauts de ligne)
 *   bullets   string[] Lignes ✓ affichées dans le bloc terminal
 *   command   string   Commande affichée (sans le $)
 *   date      string   Date optionnelle affichée en bas à droite
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SVG_PATH = join(__dirname, '../../../../public/hookstack.svg');

function loadLogoSvg() {
  if (!existsSync(SVG_PATH)) return null;
  const raw = readFileSync(SVG_PATH, 'utf8');
  return raw
    .replace(/width="100%"/, 'width="60" height="60"')
    .replace(/\s*id="Layer_1"/, '')
    .replace(/\s*enable-background="[^"]*"/, '');
}

export function generateCard({
  accroche = '',
  bullets = [],
  command = 'npx hookstack-cli@latest install',
  date = '',
}) {
  const logoSvg = loadLogoSvg();

  const brandHeader = logoSvg
    ? `<div class="brand">
        <div class="brand-logo">${logoSvg}</div>
        <span class="brand-url">www.hookstack.app</span>
      </div>`
    : `<div class="brand"><span class="brand-url">www.hookstack.app</span></div>`;

  const accrocheLignes = accroche
    .split('\n')
    .map(l => `<div>${l}</div>`)
    .join('');

  const bulletItems = bullets
    .map(
      b => `
      <div class="bullet">
        <span class="check">✓</span>
        <span class="bullet-text">${b}</span>
      </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LinkedIn card — 1080×1080 · hookstack</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      width: 1080px;
      height: 1080px;
      overflow: hidden;
      background: #0a0a0a;
      color: #f0f0f0;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      display: flex;
      flex-direction: column;
      padding: 76px;
    }

    /* ── brand header ── */
    .brand {
      display: flex;
      align-items: center;
      gap: 18px;
      padding-bottom: 52px;
    }
    .brand-logo {
      width: 54px;
      height: 54px;
      flex-shrink: 0;
    }
    .brand-logo svg {
      width: 54px;
      height: 54px;
      display: block;
    }
    .brand-url {
      font-size: 22px;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: #c0c0c0;
    }

    /* ── accroche ── */
    .accroche {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      font-size: 50px;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.02em;
      color: #f5f5f5;
      padding-bottom: 48px;
      white-space: nowrap;
    }

    /* ── terminal ── */
    .terminal {
      background: #111111;
      border: 1px solid #1e1e1e;
      border-radius: 12px;
      padding: 28px 32px;
      margin-bottom: 40px;
    }
    .command-line {
      font-size: 17px;
      color: #555;
      margin-bottom: 18px;
    }
    .command-line .dollar { color: #2e2e2e; margin-right: 10px; }
    .command-line .cmd   { color: #888; }

    .bullets {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .bullet {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 17px;
    }
    .check       { color: #4ade80; font-weight: 700; }
    .bullet-text { color: #c8c8c8; }

    /* ── footer ── */
    .footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-top: 28px;
      border-top: 1px solid #161616;
    }
    .meta { font-size: 14px; color: #777; }
  </style>
</head>
<body>
  ${brandHeader}

  <div class="accroche">${accrocheLignes}</div>

  <div class="terminal">
    <div class="command-line">
      <span class="dollar">$</span><span class="cmd">${command}</span>
    </div>
    <div class="bullets">${bulletItems}</div>
  </div>

  <div class="footer">
    <span class="meta">${date ? `${date} · ` : ''}open-source · free</span>
  </div>
</body>
</html>
<!--
  INSTRUCTIONS SCREENSHOT :
  1. Ouvrir ce fichier dans Chrome (zoom 100%, Cmd+0)
  2. Chrome DevTools → Cmd+Shift+P → "Capture screenshot"
     → Right-click sur <body> → "Capture node screenshot"
  3. Uploader le PNG résultant dans LinkedIn comme image NATIVE (pas un lien).
-->`;
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = JSON.parse(readFileSync(0, 'utf8'));
  process.stdout.write(generateCard(data));
}
