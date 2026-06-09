#!/usr/bin/env node
// Fusionne les hooks détectés (new) dans le registre (registry), en évitant les
// doublons par slug. Les hooks existants reçoivent l'éventuel exemple
// communautaire du dépôt source. Écrit le nombre d'ajouts dans
// /tmp/added-count.txt pour le pipeline CI.
import { readFileSync, writeFileSync } from 'node:fs'

const [, , newFile, registryFile, repoUrl] = process.argv
if (!newFile || !registryFile) {
  console.error('usage: merge-hooks.js <new.json> <registry.json> [repoUrl]')
  process.exit(1)
}

const incoming = JSON.parse(readFileSync(newFile, 'utf8'))
const registry = JSON.parse(readFileSync(registryFile, 'utf8'))

const bySlug = new Map(registry.map((h) => [h.slug, h]))
let added = 0

for (const hook of incoming) {
  if (!hook || !hook.slug) continue
  const example = {
    repo: repoUrl ?? hook.community_examples?.[0]?.repo ?? '',
    file_path: hook.implementation?.script_path ?? '',
  }

  if (bySlug.has(hook.slug)) {
    // Hook connu : on ajoute juste l'exemple communautaire s'il est nouveau.
    const existing = bySlug.get(hook.slug)
    existing.community_examples ??= []
    if (example.repo && !existing.community_examples.some((e) => e.repo === example.repo)) {
      existing.community_examples.push(example)
    }
  } else {
    hook.community_examples = example.repo ? [example] : []
    registry.push(hook)
    bySlug.set(hook.slug, hook)
    added++
  }
}

writeFileSync(registryFile, JSON.stringify(registry, null, 2) + '\n')
writeFileSync('/tmp/added-count.txt', String(added))
console.log(`Merged: ${added} nouveau(x) hook(s), ${registry.length} au total.`)
