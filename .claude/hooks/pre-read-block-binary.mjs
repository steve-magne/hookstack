#!/usr/bin/env node
// Bloque les lectures de fichiers binaires inutilisables par Claude (PreToolUse Read)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { extname, basename } from 'path';

const BINARY_EXTENSIONS = new Set([
  // Exécutables et librairies compilées
  'exe', 'dll', 'so', 'dylib', 'bin',
  // Bytecode compilé
  'pyc', 'pyo', 'pyd', 'class', 'o', 'a', 'lib', 'obj',
  // Archives
  'zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar', 'jar', 'war', 'ear',
  // Bases de données
  'db', 'sqlite', 'sqlite3',
  // Modèles ML / artefacts
  'pkl', 'pickle', 'pt', 'pth', 'h5', 'pb', 'onnx', 'npy', 'npz',
  // WebAssembly et autres
  'wasm', 'node',
]);

export function run(input) {
  if (input.tool_name !== 'Read') return null;

  const filePath = input.tool_input?.file_path ?? '';
  if (!filePath) return null;

  const ext = extname(filePath).toLowerCase().replace('.', '');
  if (!BINARY_EXTENSIONS.has(ext)) return null;

  const name = basename(filePath);
  return {
    decision: 'block',
    reason: `[block-binary] \`${name}\` is a binary file (.${ext}) — Claude cannot process it meaningfully. Inspect metadata with Bash instead (e.g. \`file\`, \`ls -lh\`).`,
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
