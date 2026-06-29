#!/usr/bin/env node
// Applique les hooks "bonnes pratiques" au .claude/settings.json du projet courant.
// Source 1 (toujours) : liste RECOMMENDED_SLUGS depuis le registre.
// Source 2 (optionnel) : candidats du repo scanné (hooks validés et recommandés).
// usage: apply-best-practices.js <registry.json> <settings.json> [recommended-hooks.json]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const [, , registryFile, settingsFile, candidatesFile] = process.argv;
if (!registryFile || !settingsFile) {
	console.error(
		"usage: apply-best-practices.js <registry.json> <settings.json> [recommended-hooks.json]",
	);
	process.exit(1);
}

const registry = JSON.parse(readFileSync(registryFile, "utf8"));

// Hooks recommandés pour tout projet de développement actif
const RECOMMENDED_SLUGS = [
	"pre-bash-secret-detection",
	"pre-bash-block-destructive",
	"pre-edit-protect-paths",
	"post-write-autoformat",
	"post-write-eslint",
	"post-edit-typecheck",
];

const settings = existsSync(settingsFile)
	? JSON.parse(readFileSync(settingsFile, "utf8"))
	: { hooks: {} };

settings.hooks ??= {};

// Index des commandes déjà déclarées (événement+matcher+commande)
const existingCommands = new Set();
for (const [event, entries] of Object.entries(settings.hooks)) {
	for (const entry of entries) {
		for (const h of entry.hooks ?? []) {
			existingCommands.add(`${event}:${entry.matcher ?? "*"}:${h.command}`);
		}
	}
}

// Extrait le nom de base d'un script depuis une commande (sans extension ni chemin).
function scriptBaseName(command) {
	const match = command.match(/([^/\s]+)\.(sh|mjs|js|py|rb)\b/);
	return match ? match[1] : null;
}

// Normalise une commande ou un chemin vers la convention .mjs du projet (.sh → .mjs).
function toMjs(s) {
	return s ? s.replace(/\.sh\b/g, ".mjs") : s;
}

// Vérifie si une commande équivalente (même script, extension différente) est déjà déclarée.
function hasEquivalentCommand(event, matcher, command) {
	const base = scriptBaseName(command);
	if (!base) return false;
	for (const key of existingCommands) {
		const [kEvent, kMatcher, kCmd] = key.split(":");
		if (
			kEvent === event &&
			kMatcher === matcher &&
			scriptBaseName(kCmd) === base
		)
			return true;
	}
	return false;
}

// Applique un hook dans settings si sa commande n'est pas déjà présente.
// writeScript : si true, normalise vers .mjs et crée le script local si absent.
// Retourne le nom du hook si appliqué, null sinon.
function applyHook(hook, _source, writeScript = false) {
	const fragment = hook.implementation?.config?.hooks;
	if (!fragment) return null;

	// Pour les hooks du scan : normaliser .sh → .mjs et créer le script si absent
	if (writeScript) {
		const scriptPath = toMjs(hook.implementation?.script_path);
		const codeSnippet = hook.implementation?.code_snippet;
		if (scriptPath && codeSnippet && !existsSync(scriptPath)) {
			mkdirSync(dirname(scriptPath), { recursive: true });
			writeFileSync(scriptPath, codeSnippet, "utf8");
		} else if (scriptPath && !codeSnippet && !existsSync(scriptPath)) {
			return null;
		}
	}

	let appliedCount = 0;
	for (const [event, entries] of Object.entries(fragment)) {
		settings.hooks[event] ??= [];
		for (const entry of entries) {
			const matcher = entry.matcher ?? "*";
			for (const h of entry.hooks ?? []) {
				// Normaliser la commande vers .mjs pour les hooks du scan
				const command = writeScript ? toMjs(h.command) : h.command;
				const key = `${event}:${matcher}:${command}`;
				if (existingCommands.has(key)) continue;
				// Éviter les doublons fonctionnels (même script, extension .sh vs .mjs)
				if (hasEquivalentCommand(event, matcher, command)) continue;
				let group = settings.hooks[event].find(
					(e) => (e.matcher ?? "*") === matcher,
				);
				if (!group) {
					group = matcher !== "*" ? { matcher, hooks: [] } : { hooks: [] };
					settings.hooks[event].push(group);
				}
				group.hooks ??= [];
				group.hooks.push({ ...h, command });
				existingCommands.add(key);
				appliedCount++;
			}
		}
	}
	return appliedCount > 0 ? hook.name : null;
}

// — Source 1 : slugs recommandés du registre —
let appliedFromRegistry = 0;
const namesFromRegistry = [];
for (const slug of RECOMMENDED_SLUGS) {
	const hook = registry.find((h) => h.slug === slug);
	if (!hook) continue;
	const name = applyHook(hook, "registry");
	if (name) {
		appliedFromRegistry++;
		namesFromRegistry.push(name);
	}
}

// — Source 2 : candidats issus du repo scanné (optionnel) —
let appliedFromScan = 0;
const namesFromScan = [];
if (candidatesFile && existsSync(candidatesFile)) {
	const candidates = JSON.parse(readFileSync(candidatesFile, "utf8"));
	for (const hook of candidates) {
		// Skip les slugs déjà couverts par RECOMMENDED_SLUGS pour éviter le double affichage
		if (RECOMMENDED_SLUGS.includes(hook.slug)) continue;
		const name = applyHook(hook, "scan", true); // crée le script .mjs local si absent
		if (name) {
			appliedFromScan++;
			namesFromScan.push(name);
		}
	}
}

const totalApplied = appliedFromRegistry + appliedFromScan;
writeFileSync(settingsFile, `${JSON.stringify(settings, null, 2)}\n`);
writeFileSync("/tmp/applied-count.txt", String(totalApplied));
writeFileSync("/tmp/applied-from-scan-count.txt", String(appliedFromScan));

if (appliedFromRegistry > 0) {
	console.log(`${appliedFromRegistry} hook(s) de référence appliqué(s) :`);
	for (const n of [...new Set(namesFromRegistry)]) console.log(`  • ${n}`);
}
if (appliedFromScan > 0) {
	console.log(
		`${appliedFromScan} hook(s) du repo scanné appliqué(s) au projet :`,
	);
	for (const n of [...new Set(namesFromScan)]) console.log(`  • ${n}`);
}
if (totalApplied === 0) {
	console.log("Aucun nouveau hook à appliquer — tout est déjà configuré.");
}
