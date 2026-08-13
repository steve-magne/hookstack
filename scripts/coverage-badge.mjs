#!/usr/bin/env node

/**
 * coverage-badge.mjs — génère le badge de coverage du README racine.
 *
 * Même pattern que hooks-timeline.mjs : un GÉNÉRATEUR déterministe + un garde-fou
 * `--check` en CI, plutôt qu'un pre-commit qui réécrit des fichiers en plein commit.
 *
 * Ce que ça produit (2 artefacts dérivés de coverage/coverage-summary.json) :
 *   1. public/coverage-badge.svg  → badge 4 segments (lines/statements/branches/functions)
 *   2. bloc README entre marqueurs → <!-- COVERAGE_BADGE:START/END -->
 *
 * Source de vérité : coverage/coverage-summary.json, généré par `pnpm test:coverage`
 * (reporter json-summary de vitest). Les valeurs sont arrondies à 1 décimale et les
 * couleurs suivent les seuils du gate (GATE_THRESHOLDS, miroir de vitest.config.ts) :
 * vert si ≥ seuil, rouge sinon. Déterministe : aucun timestamp « now » n'entre dans
 * la sortie, pour que `--check` soit stable entre local et CI.
 *
 * Usage :
 *   pnpm test:coverage                       # génère coverage/coverage-summary.json
 *   node scripts/coverage-badge.mjs          # écrit le badge + le bloc README
 *   node scripts/coverage-badge.mjs --dry-run  # aperçu, aucune écriture
 *   node scripts/coverage-badge.mjs --check    # CI : exit 1 si un artefact a dérivé
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const SUMMARY_PATH = resolve(ROOT, "coverage/coverage-summary.json");
const SVG_PATH = resolve(ROOT, "public/coverage-badge.svg");
const README_PATH = resolve(ROOT, "README.md");

const START_MARK = "<!-- COVERAGE_BADGE:START -->";
const END_MARK = "<!-- COVERAGE_BADGE:END -->";

// Seuils du gate de coverage — miroir de vitest.config.ts (les garder identiques).
export const GATE_THRESHOLDS = {
	lines: 80,
	statements: 80,
	branches: 80,
	functions: 75,
};

// Tolérance du garde-fou `--check` (en points entiers).
// L'arrondi à l'entier absorbe la variance v8 entre plateformes/invocations,
// mais pas un run qui retombe juste de l'autre côté du seuil d'arrondi
// (90,42 → 90 vs 90,51 → 91) : la comparaison byte-à-byte casserait alors la CI
// sur des PR innocentes. On compare donc les métriques du badge committé à
// celles du résumé courant avec une tolérance de ±1 point. Un vrai recul de
// coverage (≥ 2 points) reste détecté, et le gate vitest (seuils 80/80/80/75)
// reste la référence dure.
export const CHECK_TOLERANCE = 1;

const METRIC_LABELS = {
	lines: "lines",
	statements: "statements",
	branches: "branches",
	functions: "functions",
};

// Palette GitHub dark — cohérente avec les SVG existants (fond #0a0a0a).
const BADGE_BG = "#0a0a0a";
const LABEL_BG = "#21262d";
const LABEL_FG = "#8b949e";
const VALUE_FG = "#ffffff";
const PASS_COLOR = "#3fb950";
const FAIL_COLOR = "#f85149";
const FONT = "-apple-system,Segoe UI,Helvetica,Arial,sans-serif";

// ─────────────────────────────────────────────────────────────────────────────
// Logique pure (testable)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrait les 4 métriques du résumé vitest, arrondies à l'ENTIER.
 *
 * Pourquoi l'entier plutôt qu'une décimale : le badge est un artefact committé,
 * vérifié par `--check` en CI (comparaison byte-à-byte). Le coverage v8 n'est pas
 * strictement stable entre plateformes/versions de Node (contrairement à
 * l'historique git qui pilote hooks-timeline) : un écart ≥ 0,05 ferait dériver le
 * badge et casserait la CI sur des PR innocentes. L'entier absorbe cette variance
 * (il faudrait ≥ 0,5 point d'écart pour dériver) tout en affichant les 4 métriques.
 */
export function extractMetrics(summary, keys = Object.keys(GATE_THRESHOLDS)) {
	const out = {};
	for (const key of keys) {
		const pct = summary?.total?.[key]?.pct;
		out[key] = pct == null ? null : Math.round(pct);
	}
	return out;
}

/** Largeur estimée d'un segment (label ou valeur) à font-size 11. */
export function textWidth(text) {
	return text.length * 6.8 + 16;
}

/**
 * Rend le badge 4 segments en SVG autonome (embarqué dans le README via <img>).
 * Chaque segment = label (fond neutre) + valeur (fond vert/rouge selon le seuil).
 * Purement déterministe.
 */
export function renderBadgeSvg(metrics, thresholds = GATE_THRESHOLDS) {
	// Couleur calculée sur la valeur ARRONDIE (et non la pct brute) : coloriser à
	// partir de la valeur non arrondie réintroduirait la dérive cross-platform au
	// voisinage du seuil (79.6 sur mac, 80.1 sur ubuntu → vert/rouge diffèrent →
	// `--check` casserait). En pratique la bande ±0,5 est masquée en CI : l'étape
	// badge ne tourne qu'après un `test:coverage` qui a déjà validé le gate agrégé.
	const segments = Object.keys(thresholds)
		.map((key) => {
			const label = METRIC_LABELS[key];
			const pct = metrics[key];
			const value = pct == null ? "—" : `${pct}%`;
			const pass = pct != null && pct >= thresholds[key];
			return { label, value, color: pass ? PASS_COLOR : FAIL_COLOR };
		})
		.filter((s) => s.label);

	const widths = segments.map((s) => textWidth(s.label) + textWidth(s.value));
	// Largeur totale arrondie à l'entier : un badge de largeur fractionnaire
	// (481.5999…) rendrait flou. Les positions internes restent exactes.
	const W = Math.round(widths.reduce((a, b) => a + b, 0));
	const H = 20;

	const aria = `HookStack coverage — ${segments
		.map((s) => `${s.label} ${s.value}`)
		.join(", ")}`;

	const lines = [];
	lines.push(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" ` +
			`font-family="${FONT}" role="img" aria-label="${aria}">`,
	);
	lines.push(`  <rect width="${W}" height="${H}" rx="3" fill="${BADGE_BG}"/>`);

	// Les largeurs internes restent exactes (positions non arrondies), seules les
	// coordonnées émises le sont — déterministe, stable pour `--check`.
	const round = (v) => Math.round(v * 10) / 10;
	let x = 0;
	segments.forEach((s, i) => {
		const labelW = textWidth(s.label);
		const valueW = textWidth(s.value);
		const first = i === 0;
		const last = i === segments.length - 1;
		lines.push(
			`  <rect x="${round(x)}" y="0" width="${labelW}" height="${H}" fill="${LABEL_BG}" rx="${first ? "3 0 0 3" : "0"}"/>`,
		);
		lines.push(
			`  <text x="${round(x + 8)}" y="13.5" font-size="11" fill="${LABEL_FG}">${s.label}</text>`,
		);
		lines.push(
			`  <rect x="${round(x + labelW)}" y="0" width="${valueW}" height="${H}" fill="${s.color}" rx="${last ? "0 3 3 0" : "0"}"/>`,
		);
		lines.push(
			`  <text x="${round(x + labelW + 8)}" y="13.5" font-size="11" fill="${VALUE_FG}">${s.value}</text>`,
		);
		x += labelW + valueW;
	});

	lines.push(`</svg>`);
	return `${lines.join("\n")}\n`;
}

/**
 * Extrait les métriques encodées dans un artefact committé (aria-label du SVG
 * ou alt du bloc README — mêmes valeurs, séparateurs " , " ou " · ").
 * Retourne null si une des 4 métriques est illisible.
 */
export function extractMetricsFromLabel(label) {
	const out = {};
	for (const part of (label ?? "").split(/,|·/)) {
		const m = part.match(/(\w+)\s+(\d+)%/);
		if (m) out[m[1]] = Number(m[2]);
	}
	return Object.keys(GATE_THRESHOLDS).every((k) => k in out) ? out : null;
}

/** Métriques du badge SVG committé (aria-label). */
export function extractMetricsFromSvg(svg) {
	const m = svg?.match(/aria-label="HookStack coverage — ([^"]+)"/);
	return m ? extractMetricsFromLabel(m[1]) : null;
}

/** Métriques du bloc README committé (alt de l'image). */
export function extractMetricsFromReadme(readme) {
	const m = readme?.match(/alt="HookStack coverage — ([^"]+)"/);
	return m ? extractMetricsFromLabel(m[1]) : null;
}

/**
 * Métriques dont l'écart entre le committé et le résumé courant dépasse la
 * tolérance (ou qui ont changé de nullité). Vide = synchrones.
 */
export function coverageDrift(committed, current, tolerance = CHECK_TOLERANCE) {
	const drift = [];
	for (const key of Object.keys(GATE_THRESHOLDS)) {
		const a = committed?.[key];
		const b = current[key];
		if (a == null && b == null) continue;
		if (a == null || b == null || Math.abs(a - b) > tolerance) drift.push(key);
	}
	return drift;
}

/** Construit le bloc README complet (marqueurs inclus). */
export function renderReadmeBlock(metrics) {
	const parts = Object.keys(GATE_THRESHOLDS)
		.map((key) => {
			const pct = metrics[key];
			return `${METRIC_LABELS[key]} ${pct == null ? "—" : `${pct}%`}`;
		})
		.join(" · ");
	return [
		START_MARK,
		"",
		'<p align="center">',
		`  <img src="public/coverage-badge.svg" alt="HookStack coverage — ${parts}"/>`,
		"</p>",
		"",
		`<sub>Unit-test coverage (agrégat) · gate CI : lines/statements/branches ≥ 80 %, functions ≥ 75 %</sub>`,
		"",
		END_MARK,
	].join("\n");
}

/**
 * Injecte/replace le bloc dans le README. Si les marqueurs existent → remplace entre
 * eux. Sinon → insère dans le hero, juste avant la démo GIF (à côté des autres
 * badges) ; fallback : avant le premier titre « ## ».
 */
export function injectReadme(readme, block) {
	const startIdx = readme.indexOf(START_MARK);
	const endIdx = readme.indexOf(END_MARK);
	if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
		return (
			readme.slice(0, startIdx) + block + readme.slice(endIdx + END_MARK.length)
		);
	}
	const demoIdx = readme.indexOf('<img src="public/demo-hookstack.gif"');
	if (demoIdx !== -1) {
		return `${readme.slice(0, demoIdx) + block}\n\n${readme.slice(demoIdx)}`;
	}
	const headingIdx = readme.search(/^## /m);
	if (headingIdx !== -1) {
		return `${readme.slice(0, headingIdx) + block}\n\n${readme.slice(headingIdx)}`;
	}
	return `${readme.trimEnd()}\n\n${block}\n`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestration (effets de bord)
// ─────────────────────────────────────────────────────────────────────────────

export function generate({
	readSummary = () => JSON.parse(readFileSync(SUMMARY_PATH, "utf8")),
} = {}) {
	const metrics = extractMetrics(readSummary());
	return {
		metrics,
		svg: renderBadgeSvg(metrics),
		readmeBlock: renderReadmeBlock(metrics),
	};
}

/* v8 ignore start */
function main() {
	const DRY = process.argv.includes("--dry-run");
	const CHECK = process.argv.includes("--check");

	if (!existsSync(SUMMARY_PATH)) {
		console.error(
			"\n✗ coverage/coverage-summary.json introuvable — lancer `pnpm test:coverage` d'abord.",
		);
		process.exit(1);
	}

	const { metrics, svg, readmeBlock } = generate();
	const readme = readFileSync(README_PATH, "utf8");
	const nextReadme = injectReadme(readme, readmeBlock);

	console.log(
		`\nCoverage : ${Object.keys(metrics)
			.map(
				(k) =>
					`${METRIC_LABELS[k]} ${metrics[k] == null ? "—" : `${metrics[k]}%`}`,
			)
			.join(" · ")}`,
	);

	if (CHECK) {
		const drift = [];
		const svgMetrics = existsSync(SVG_PATH)
			? extractMetricsFromSvg(readFileSync(SVG_PATH, "utf8"))
			: null;
		if (!svgMetrics) {
			drift.push("public/coverage-badge.svg (absent ou métriques illisibles)");
		} else {
			const keys = coverageDrift(svgMetrics, metrics);
			if (keys.length)
				drift.push(`public/coverage-badge.svg (${keys.join(", ")})`);
		}
		const readmeMetrics = extractMetricsFromReadme(readme);
		if (!readmeMetrics || !readme.includes(START_MARK)) {
			drift.push("README.md (bloc COVERAGE_BADGE)");
		} else {
			const keys = coverageDrift(readmeMetrics, metrics);
			if (keys.length)
				drift.push(`README.md (bloc COVERAGE_BADGE — ${keys.join(", ")})`);
		}
		if (drift.length) {
			console.error(`\n✗ ${drift.length} artefact(s) badge désynchronisé(s) :`);
			drift.forEach((d) => {
				console.error(`    - ${d}`);
			});
			console.error(
				"  Lancer 'pnpm coverage:badge' (ou 'node scripts/coverage-badge.mjs') puis committer.",
			);
			process.exit(1);
		}
		console.log("\n✓ artefacts badge synchrones.");
		process.exit(0);
	}

	if (DRY) {
		console.log("\n[dry-run] aucune écriture effectuée");
		return;
	}

	writeFileSync(SVG_PATH, svg, "utf8");
	writeFileSync(README_PATH, nextReadme, "utf8");
	console.log(
		"\n✓ public/coverage-badge.svg et README.md (bloc COVERAGE_BADGE) mis à jour",
	);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main();
}
/* v8 ignore stop */
