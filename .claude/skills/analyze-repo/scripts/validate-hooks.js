#!/usr/bin/env node
// validate-hooks.js <hooks.json>
// Filtre les hooks selon le schéma actuel du registre (registry.schema.json) et les
// bonnes pratiques agentiques avant insertion. Les champs retirés du schéma en #236
// (id, provider, i18n, community_examples, votes) ne sont plus exigés ni produits.
//
// Sorties :
//   /tmp/hookstack-hooks-validated.json   — hooks passant la validation (prêts pour le merge)
//   /tmp/hookstack-hooks-rejected.json    — hooks rejetés avec raisons
//   /tmp/hookstack-hooks-recommended.json — sous-ensemble valide, bénéfique pour le projet courant
//   /tmp/hookstack-validation-count.txt   — nombre de hooks valides
import { readFileSync, writeFileSync } from "node:fs";

const VALID_CATEGORIES = [
	"security",
	"context",
	"validation",
	"notification",
	"workflow",
	"documentation",
];

// Aligné sur l'enum hook_type de registry.schema.json (superset des types affichés).
const VALID_HOOK_TYPES = [
	"PreToolUse",
	"PostToolUse",
	"PostToolUseFailure",
	"PostToolBatch",
	"UserPromptSubmit",
	"UserPromptExpansion",
	"Notification",
	"MessageDisplay",
	"Stop",
	"StopFailure",
	"SubagentStart",
	"SubagentStop",
	"PreCompact",
	"PostCompact",
	"SessionStart",
	"SessionEnd",
	"WorktreeCreate",
	"WorktreeRemove",
	"PermissionRequest",
	"PermissionDenied",
	"CwdChanged",
	"ConfigChange",
	"FileChanged",
	"InstructionsLoaded",
	"TaskCreated",
	"TaskCompleted",
	"TeammateIdle",
	"Setup",
];

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Commandes pouvant bloquer l'agent si utilisées en pre-hook sur trigger large
const SLOW_PATTERNS = [
	/\bcurl\b/,
	/\bwget\b/,
	/\bnpm (install|ci)\b/,
	/\bpip install\b/,
	/\bsleep\s+\d+/,
];
// Commandes destructives sans garde-fou explicite
const DESTRUCTIVE_PATTERNS = [
	/rm\s+-[a-z]*r[a-z]*f?\s+\/[^/]/,
	/\bDROP\s+TABLE\b/i,
	/\btruncate\s+\/\b/,
];

const [, , hooksFile] = process.argv;
if (!hooksFile) {
	console.error("usage: validate-hooks.js <hooks.json>");
	process.exit(1);
}

const hooks = JSON.parse(readFileSync(hooksFile, "utf8"));
const validated = [];
const rejected = [];
const recommended = [];

for (const hook of hooks) {
	const errors = [];
	const warnings = [];

	// — Vérifications structurelles (alignées sur registry.schema.json) —
	if (!hook.slug) errors.push("slug manquant");
	else if (!SLUG_RE.test(hook.slug))
		errors.push(`slug invalide (kebab-case attendu): "${hook.slug}"`);
	if (!hook.name || hook.name.length < 3)
		errors.push("name absent ou trop court");
	if (!hook.benefit || hook.benefit.length < 8)
		errors.push("benefit absent ou trop court");
	else if (hook.benefit.length > 90)
		errors.push(`benefit trop long (${hook.benefit.length} > 90 caractères)`);
	if (!VALID_CATEGORIES.includes(hook.category))
		errors.push(`category invalide: "${hook.category}"`);
	if (!VALID_HOOK_TYPES.includes(hook.hook_type))
		errors.push(`hook_type invalide: "${hook.hook_type}"`);
	if (!hook.trigger || hook.trigger.length < 1) errors.push("trigger absent");
	if (!hook.description || hook.description.length < 10)
		errors.push("description absente ou trop courte");
	if (!Array.isArray(hook.use_cases) || hook.use_cases.length === 0)
		errors.push("use_cases absent ou vide");
	if (!Array.isArray(hook.tags) || hook.tags.length === 0)
		errors.push("tags absent ou vide (min 1)");
	if (hook.implementation?.type !== "settings_json")
		errors.push('implementation.type doit être "settings_json"');
	if (!hook.implementation?.script_path?.endsWith(".mjs"))
		errors.push("implementation.script_path doit pointer vers un .mjs");
	if (!hook.implementation?.config?.hooks)
		errors.push("implementation.config.hooks absent");

	// Vérifie que la structure de config est exécutable par Claude Code
	const configHooks = hook.implementation?.config?.hooks ?? {};
	const allCommands = Object.values(configHooks)
		.flat()
		.flatMap((entry) => entry.hooks ?? []);

	if (allCommands.length > 0 && allCommands.some((h) => h.type !== "command")) {
		errors.push('une entrée de hook n\'a pas type:"command"');
	}
	if (allCommands.length > 0 && allCommands.some((h) => !h.command)) {
		errors.push("une entrée de hook n'a pas de champ command");
	}

	// — Anti-patterns de performance —
	// PreToolUse sur trigger large avec commande lente = latence sur chaque outil
	if (hook.hook_type === "PreToolUse") {
		const isWideTrigger = !hook.trigger || hook.trigger === "*";
		const cmdText = allCommands.map((h) => h.command ?? "").join(" ");
		if (isWideTrigger && SLOW_PATTERNS.some((p) => p.test(cmdText))) {
			warnings.push(
				`PreToolUse sur trigger "${hook.trigger ?? "*"}" avec commande potentiellement lente` +
					` — risque de latence sur chaque appel d'outil`,
			);
		}
	}

	// — Anti-patterns de sécurité —
	const fullCommandText = allCommands.map((h) => h.command ?? "").join("\n");
	if (DESTRUCTIVE_PATTERNS.some((p) => p.test(fullCommandText))) {
		errors.push("commande destructive large détectée (rm -rf / ou équivalent)");
	}

	if (errors.length > 0) {
		rejected.push({ slug: hook.slug ?? "(sans slug)", errors, warnings });
		continue;
	}

	validated.push(hook);

	// — Critères d'application au projet courant —
	// Bénéfiques universellement : sécurité et validation, implémentation concrète, sans effets réseau en pre-hook
	const isSafeForProject =
		["security", "validation"].includes(hook.category) &&
		allCommands.length > 0 &&
		warnings.length === 0;

	if (isSafeForProject) recommended.push(hook);
}

writeFileSync(
	"/tmp/hookstack-hooks-validated.json",
	`${JSON.stringify(validated, null, 2)}\n`,
);
writeFileSync(
	"/tmp/hookstack-hooks-rejected.json",
	`${JSON.stringify(rejected, null, 2)}\n`,
);
writeFileSync(
	"/tmp/hookstack-hooks-recommended.json",
	`${JSON.stringify(recommended, null, 2)}\n`,
);
writeFileSync("/tmp/hookstack-validation-count.txt", String(validated.length));

const total = hooks.length;
console.log(
	`Validation : ${validated.length}/${total} valide(s), ${rejected.length} rejeté(s), ${recommended.length} recommandé(s) pour le projet`,
);

if (rejected.length > 0) {
	console.log("Rejetés :");
	for (const r of rejected)
		console.log(`  ✗ ${r.slug}: ${r.errors.join("; ")}`);
}
