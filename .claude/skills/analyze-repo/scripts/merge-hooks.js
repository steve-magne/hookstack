#!/usr/bin/env node
// Fusionne les hooks détectés (new) dans le registre (registry), en évitant les
// doublons par slug : un slug déjà présent est ignoré (le principe est déjà couvert),
// un slug nouveau est appendé tel quel. Le champ community_examples a été retiré du
// schéma (#236) — la traçabilité des sources vit dans registry/scanned-repos.json.
// Écrit le nombre d'ajouts dans /tmp/added-count.txt pour le pipeline CI.
import { readFileSync, writeFileSync } from "node:fs";

const [, , newFile, registryFile] = process.argv;
if (!newFile || !registryFile) {
	console.error("usage: merge-hooks.js <new.json> <registry.json>");
	process.exit(1);
}

const incoming = JSON.parse(readFileSync(newFile, "utf8"));
const registry = JSON.parse(readFileSync(registryFile, "utf8"));

const bySlug = new Map(registry.map((h) => [h.slug, h]));
let added = 0;
let skipped = 0;

for (const hook of incoming) {
	if (!hook?.slug) continue;
	if (bySlug.has(hook.slug)) {
		skipped++;
		console.log(`  · déjà au registre (ignoré) : ${hook.slug}`);
		continue;
	}
	registry.push(hook);
	bySlug.set(hook.slug, hook);
	added++;
}

writeFileSync(registryFile, `${JSON.stringify(registry, null, 2)}\n`);
writeFileSync("/tmp/added-count.txt", String(added));
console.log(
	`Merged: ${added} nouveau(x) hook(s), ${skipped} slug(s) déjà couvert(s), ${registry.length} au total.`,
);
