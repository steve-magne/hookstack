#!/usr/bin/env node
// Script CI : vérifie les liens et images relatifs cassés dans tous les .md/.mdx du repo.
// Importe les run() des hooks Stop (qui font déjà ce travail en session) pour réutiliser
// la même logique sans duplication. Exit 1 si des problèmes sont trouvés.
import { run as checkLinks } from '../.claude/hooks/stop-dead-link-checker.mjs';
import { run as checkImages } from '../.claude/hooks/stop-dead-image-checker.mjs';

const linkResult = checkLinks({});
const imageResult = checkImages({});

let hasError = false;

if (linkResult) {
  process.stderr.write(linkResult.message + '\n');
  hasError = true;
}

if (imageResult) {
  process.stderr.write(imageResult.message + '\n');
  hasError = true;
}

if (hasError) process.exit(1);
