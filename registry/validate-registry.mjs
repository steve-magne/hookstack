#!/usr/bin/env node
// validate-registry.mjs — valide registry/registry.json contre registry.schema.json.
//
// Garde-fou de structure du catalogue : chaque hook doit respecter le schéma
// (champs requis, énumérations, pas de champ inconnu — `additionalProperties:false`
// empêche la réintroduction de métadonnées mortes type `id`/`votes`).
//
// Usage : node registry/validate-registry.mjs   (exit ≠ 0 si invalide)
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, "registry.schema.json");
const registryPath = join(here, "registry.json");

const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const registry = JSON.parse(readFileSync(registryPath, "utf8"));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validate = ajv.compile(schema);
const ok = validate(registry);

if (ok) {
	console.log(
		`✓ registry.json valide — ${registry.length} hook(s) conformes au schéma.`,
	);

	// Lint éditorial (non bloquant) : `benefit` doit viser ≤ ~60 caractères (cap dur : 90, dans le schéma).
	const BENEFIT_TARGET = 60;
	const longBenefits = registry.filter(
		(h) => (h.benefit ?? "").length > BENEFIT_TARGET,
	);
	if (longBenefits.length) {
		console.log(
			`\n⚠ ${longBenefits.length} benefit(s) au-dessus de la cible éditoriale (${BENEFIT_TARGET} car.) :`,
		);
		for (const h of longBenefits) {
			console.log(`  ${h.slug} (${h.benefit.length}) : ${h.benefit}`);
		}
	}
	process.exit(0);
}

// Regroupe les erreurs par hook pour un diagnostic lisible.
const bySlug = new Map();
for (const err of validate.errors ?? []) {
	const m = /^\/(\d+)/.exec(err.instancePath);
	const idx = m ? Number(m[1]) : null;
	const slug = idx !== null ? (registry[idx]?.slug ?? `#${idx}`) : "(racine)";
	const path = err.instancePath.replace(/^\/\d+/, "") || "(hook)";
	if (!bySlug.has(slug)) bySlug.set(slug, []);
	bySlug.get(slug).push(`${path} ${err.message}`);
}

console.error(
	`✗ registry.json invalide — ${bySlug.size} hook(s) en erreur :\n`,
);
for (const [slug, errors] of bySlug) {
	console.error(`  ${slug}`);
	for (const e of errors) console.error(`    · ${e}`);
}
process.exit(1);
