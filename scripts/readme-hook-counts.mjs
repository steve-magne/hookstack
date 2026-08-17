#!/usr/bin/env node

/**
 * readme-hook-counts.mjs — garde-fou des comptes de hooks cités dans les docs.
 *
 * Pourquoi : les READMEs et les docs de référence promettent des chiffres précis
 * (« a default Python install currently lands **63 hooks, 100 % as `.py`, zero
 * `.mjs` fallback** », « 93 hooks actifs sur le repo lui-même »). Ces chiffres
 * dérivent du registre (champ `default_on` + `stack` + présence d'une variante
 * `.py`) et de l'artefact généré `.claude/settings.json` — pas d'un fichier
 * versionné dédié — donc ils se périment en silence quand on ajoute/retire un
 * hook. Ce script est le même pattern que coverage-badge.mjs / hooks-timeline.mjs :
 * un GÉNÉRATEUR déterministe + un garde-fou `--check` en CI.
 *
 * Sources de vérité :
 *   - registry/registry.json   → comptes du catalogue (default_on, stack, .py)
 *   - .claude/settings.json    → hooks effectivement actifs sur ce repo (dogfood)
 *
 * Usage :
 *   node scripts/readme-hook-counts.mjs            # réécrit les comptes dans les docs
 *   node scripts/readme-hook-counts.mjs --dry-run  # aperçu, aucune écriture
 *   node scripts/readme-hook-counts.mjs --check    # CI : exit 1 si un compte a dérivé
 *
 * Invariant surveillé en plus des comptes : un install Python par défaut doit être
 * 100 % `.py` (zéro fallback `.mjs`). Si un hook `default_on` perd sa variante, le
 * script échoue en demandant soit d'ajouter la variante, soit de reformuler le
 * README — il ne réécrit jamais une phrase devenue fausse.
 *
 * Hors périmètre volontaire : `okf/log.md` et les notes `okf/implementation/*`
 * (Playbooks) sont des **archives historiques** — leurs chiffres (« 66 hooks »,
 * « 80/105 variantes ») décrivent l'état au moment du changement et ne doivent
 * PAS être réécrits pour suivre le registre courant. On ne verrouille que les
 * docs de référence à état courant (CLAUDE.md, READMEs,
 * architecture/business/product/vision).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { filterHooksByStack } from "../packages/cli/bin/core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const REGISTRY_PATH = resolve(ROOT, "registry/registry.json");
const SETTINGS_PATH = resolve(ROOT, ".claude/settings.json");
const CLAUDE_MD_PATH = resolve(ROOT, "CLAUDE.md");
const README_PATH = resolve(ROOT, "README.md");
const CLI_README_PATH = resolve(ROOT, "packages/cli/README.md");
const OKF_MONETIZATION_PATH = resolve(ROOT, "okf/business/monetization.md");
const OKF_HOOK_101_PATH = resolve(ROOT, "okf/product/hook-101.md");
const DOC_VISION_PATH = resolve(ROOT, "doc/product/06-vision-produit.md");

// Marqueurs du bloc « at a glance » généré dans README.md (même pattern que le
// badge de coverage : un artefact dérivé, jamais édité à la main).
const STATS_START = "<!-- HOOK_COUNTS:START -->";
const STATS_END = "<!-- HOOK_COUNTS:END -->";

// ─────────────────────────────────────────────────────────────────────────────
// Logique pure (testable)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Faits dérivés du registre qui alimentent les phrases verrouillées.
 *
 * `pythonDefault` = hooks `default_on` installables sur un projet Python (hooks
 * universels sans `stack` + hooks `stack: ["python"]`), c.-à-d. exactement le
 * filtrage que le CLI applique à l'install par défaut (`filterHooksByStack`).
 * `pythonFallback` = combien de ce set n'ont PAS de variante `.py` — doit rester 0.
 * Les autres clés sont des comptes bruts du catalogue, exposés pour les claims
 * futurs et pour le rapport d'exécution.
 */
export function computeFacts(hooks) {
	const list = Array.isArray(hooks) ? hooks : [];
	const defaultOn = list.filter((h) => h.default_on === true);
	// Réutilise le filtre réel du CLI (source unique) plutôt qu'une copie maison :
	// `pythonDefault` doit rester exactement ce que `install` pose sur un projet
	// Python, sinon le guard dériverait de la réalité qu'il prétend surveiller.
	const pythonDefault = filterHooksByStack(defaultOn, ["python"]);
	const pythonPyVariants = pythonDefault.filter(
		(h) => h.implementation?.python_script_path,
	);
	const countStack = (name) =>
		list.filter((h) => h.stack?.includes(name)).length;
	return {
		total: list.length,
		defaultOn: defaultOn.length,
		pythonDefault: pythonDefault.length,
		pythonPyVariants: pythonPyVariants.length,
		pythonFallback: pythonDefault.length - pythonPyVariants.length,
		cataloguePyVariants: list.filter(
			(h) => h.implementation?.python_script_path,
		).length,
		stackTypescript: countStack("typescript"),
		stackPython: countStack("python"),
		stackJava: countStack("java"),
	};
}

/**
 * Compte les hooks **actifs** sur ce repo (dogfood) : les scripts distincts
 * référencés dans `.claude/settings.json` généré par sync-hooks. C'est la vérité
 * de « hooks actifs » — pas un recomptage du registre, qui inclut les hooks
 * exclus localement (EXCLUDED_SLUGS) et les stacks non activées (python/java).
 */
export function computeDogfoodCount(settingsJson) {
	const slugs = new Set();
	for (const m of (settingsJson ?? "").matchAll(
		/\.claude\/hooks\/([a-z0-9-]+)\.(?:mjs|py)/g,
	)) {
		slugs.add(m[1]);
	}
	return slugs.size;
}

/**
 * Rend le bloc « at a glance » (marqueurs inclus) qui expose tous les comptes
 * bruts du catalogue — y compris ceux qu'aucune phrase ne cite encore (par stack,
 * variantes). Déterministe : aucune donnée externe, donc stable pour `--check`.
 */
export function renderStatsBlock(facts) {
	const line = [
		`${facts.total} hooks`,
		`${facts.defaultOn} default`,
		`${facts.cataloguePyVariants} .py variants`,
		`TypeScript ${facts.stackTypescript} · Python ${facts.stackPython} · Java ${facts.stackJava}`,
		`${facts.dogfooded} dogfooded`,
	].join(" · ");
	return [
		STATS_START,
		"",
		`<p align="center"><sub>${line}</sub></p>`,
		"",
		STATS_END,
	].join("\n");
}

/**
 * Injecte/replace le bloc stats dans le README. Si les marqueurs existent →
 * remplace entre eux. Sinon → insère avant le premier titre « ## » (sous le hero,
 * à côté des autres artefacts dérivés). Idempotent.
 */
export function injectStatsBlock(content, block) {
	const startIdx = content.indexOf(STATS_START);
	const endIdx = content.indexOf(STATS_END);
	if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
		return (
			content.slice(0, startIdx) +
			block +
			content.slice(endIdx + STATS_END.length)
		);
	}
	const headingIdx = content.search(/^## /m);
	if (headingIdx !== -1) {
		return `${content.slice(0, headingIdx) + block}\n\n${content.slice(headingIdx)}`;
	}
	return `${content.trimEnd()}\n\n${block}\n`;
}

/**
 * L'invariant « 100 % .py, zéro fallback » n'est vrai que si chaque hook installable
 * sur Python porte une variante `.py`. Retourne null si l'invariant tient, sinon un
 * message expliquant que la prose des READMEs est devenue fausse.
 */
export function pythonInvariantError(facts) {
	return facts.pythonFallback === 0
		? null
		: `le set Python par défaut compte ${facts.pythonFallback} hook(s) sans variante .py — la phrase « 100 % .py, zero .mjs fallback » des READMEs n'est plus vraie (ajouter la variante .py manquante ou reformuler les READMEs).`;
}

/**
 * Les phrases verrouillées : chaque claim ancre un nombre précis dans une doc.
 * `fact` nomme la clé des faits attendue ; `render` reconstruit la phrase avec le
 * bon nombre (idempotent). Un seul match par claim — les patterns sont volontairement
 * ancrés au contexte de phrase pour ne jamais attraper autre chose.
 */
export const CLAIMS = [
	{
		id: "CLAUDE.md — hooks du catalogue actifs sur ce projet",
		file: CLAUDE_MD_PATH,
		fact: "dogfooded",
		pattern: /(\d+) hooks du catalogue sont actifs sur ce projet/,
		render: (facts) =>
			`${facts.dogfooded} hooks du catalogue sont actifs sur ce projet`,
	},
	{
		id: "README.md — default Python install count",
		file: README_PATH,
		fact: "pythonDefault",
		pattern:
			/lands \*\*(\d+) hooks, 100 % as `\.py`, zero `\.mjs` fallback\*\*/,
		render: (facts) =>
			`lands **${facts.pythonDefault} hooks, 100 % as \`.py\`, zero \`.mjs\` fallback**`,
	},
	{
		id: "packages/cli/README.md — Python hooks today",
		file: CLI_README_PATH,
		fact: "pythonDefault",
		pattern: /\((\d+) Python hooks today — /,
		render: (facts) => `(${facts.pythonDefault} Python hooks today — `,
	},
	{
		id: "okf/business/monetization.md — hooks actifs sur le repo",
		file: OKF_MONETIZATION_PATH,
		fact: "dogfooded",
		pattern: /\((\d+) hooks actifs sur le repo lui-même\)/,
		render: (facts) => `(${facts.dogfooded} hooks actifs sur le repo lui-même)`,
	},
	{
		id: "okf/product/hook-101.md — hooks dogfoodés",
		file: OKF_HOOK_101_PATH,
		fact: "dogfooded",
		pattern: /(\d+)\+? hooks dogfoodés/,
		render: (facts) => `${facts.dogfooded} hooks dogfoodés`,
	},
	{
		id: "doc/product/06-vision-produit.md — dogfood complet",
		file: DOC_VISION_PATH,
		fact: "dogfooded",
		pattern: /dogfood complet avec (\d+) hooks actifs/,
		render: (facts) => `dogfood complet avec ${facts.dogfooded} hooks actifs`,
	},
];

/** Lit le nombre committé par un claim (null si la phrase a changé de forme). */
export function extractClaim(content, claim) {
	const m = content.match(claim.pattern);
	return m ? Number(m[1]) : null;
}

/** Regroupe les claims par fichier (plusieurs claims peuvent partager une doc). */
function groupByFile(claims) {
	const map = new Map();
	for (const claim of claims) {
		if (!map.has(claim.file)) map.set(claim.file, []);
		map.get(claim.file).push(claim);
	}
	return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestration (effets de bord injectables)
// ─────────────────────────────────────────────────────────────────────────────

const defaultDeps = {
	loadRegistry: () => JSON.parse(readFileSync(REGISTRY_PATH, "utf8")),
	readSettings: () => readFileSync(SETTINGS_PATH, "utf8"),
	readFile: (path) => readFileSync(path, "utf8"),
};

/**
 * Compare les comptes committés aux faits du registre et prépare le contenu corrigé.
 * Retourne :
 *   - facts          → faits dérivés (computeFacts + dogfooded)
 *   - invariantError → null si « 100 % .py » tient, message sinon
 *   - drift          → [{ claim, type: "count"|"missing", committed, expected }]
 *   - statsDrift     → true si le bloc HOOK_COUNTS de README.md a dérivé
 *   - updated        → { [chemin]: contenu corrigé } — un fichier n'y figure que si
 *                      toutes ses phrases ont été trouvées (on n'écrit jamais un
 *                      fichier à moitié corrigé).
 */
export function generate(deps = defaultDeps) {
	const registry = deps.loadRegistry();
	const facts = {
		...computeFacts(registry),
		dogfooded: computeDogfoodCount(deps.readSettings()),
	};
	const invariantError = pythonInvariantError(facts);
	const statsBlock = renderStatsBlock(facts);

	const updated = {};
	const drift = [];

	for (const [file, claims] of groupByFile(CLAIMS)) {
		let content = deps.readFile(file);
		let missing = false;
		for (const claim of claims) {
			const committed = extractClaim(content, claim);
			if (committed === null) {
				drift.push({
					claim,
					type: "missing",
					committed: null,
					expected: facts[claim.fact],
				});
				missing = true;
				continue;
			}
			if (committed !== facts[claim.fact]) {
				drift.push({
					claim,
					type: "count",
					committed,
					expected: facts[claim.fact],
				});
			}
			content = content.replace(claim.pattern, claim.render(facts));
		}
		if (!missing) updated[file] = content;
	}

	// Artefact dérivé (bloc HOOK_COUNTS) dans README.md, même pattern que le badge
	// de coverage. Injecté seulement si la prose du README a été trouvée.
	let statsDrift = false;
	if (updated[README_PATH] !== undefined) {
		const next = injectStatsBlock(updated[README_PATH], statsBlock);
		if (next !== updated[README_PATH]) statsDrift = true;
		updated[README_PATH] = next;
	} else {
		const current = deps.readFile(README_PATH);
		if (injectStatsBlock(current, statsBlock) !== current) statsDrift = true;
	}

	return { facts, invariantError, drift, statsDrift, updated };
}

// ─────────────────────────────────────────────────────────────────────────────

/* v8 ignore start */
function main() {
	const DRY = process.argv.includes("--dry-run");
	const CHECK = process.argv.includes("--check");

	const { facts, invariantError, drift, statsDrift, updated } = generate();

	console.log(
		`Python default install: ${facts.pythonDefault} hooks (${facts.pythonPyVariants} .py, ${facts.pythonFallback} .mjs fallback) · default_on: ${facts.defaultOn} · dogfooded: ${facts.dogfooded}`,
	);

	if (invariantError) {
		console.error(`\n✗ ${invariantError}`);
		console.error(
			"  Aucune écriture effectuée — corriger la variante ou la prose, puis relancer 'pnpm readme:counts'.",
		);
		process.exit(1);
	}

	const missing = drift.filter((d) => d.type === "missing");
	if (missing.length) {
		console.error(`\n✗ ${missing.length} phrase(s) introuvable(s) :`);
		missing.forEach((d) => {
			console.error(`    - ${d.claim.id} (prose modifiée ?)`);
		});
		console.error(
			"  Mettre à jour le pattern du claim dans scripts/readme-hook-counts.mjs.",
		);
		process.exit(1);
	}

	if (CHECK) {
		if (drift.length || statsDrift) {
			console.error(`\n✗ comptes docs désynchronisés :`);
			drift.forEach((d) => {
				console.error(`    - ${d.claim.id}: ${d.committed} → ${d.expected}`);
			});
			if (statsDrift) {
				console.error("    - README.md (bloc HOOK_COUNTS)");
			}
			console.error(
				"  Lancer 'pnpm readme:counts' (ou 'node scripts/readme-hook-counts.mjs') puis committer.",
			);
			process.exit(1);
		}
		console.log("\n✓ comptes docs synchrones.");
		process.exit(0);
	}

	if (DRY) {
		const lines = drift.map(
			(d) => `  - ${d.claim.id}: ${d.committed} → ${d.expected}`,
		);
		if (statsDrift) lines.push("  - README.md (bloc HOOK_COUNTS)");
		console.log(
			lines.length
				? `\n[dry-run] corrigerait :\n${lines.join("\n")}`
				: "\n[dry-run] aucun changement nécessaire",
		);
		return;
	}

	for (const [file, content] of Object.entries(updated)) {
		writeFileSync(file, content, "utf8");
	}
	const changed = drift.length + (statsDrift ? 1 : 0);
	console.log(
		changed
			? `\n✓ ${changed} artefact(s) docs mis à jour.`
			: "\n✓ comptes docs déjà synchrones.",
	);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main();
}
/* v8 ignore stop */
