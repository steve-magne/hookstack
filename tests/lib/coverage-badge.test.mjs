import { describe, expect, it } from "vitest";
import {
	coverageDrift,
	extractMetrics,
	extractMetricsFromLabel,
	extractMetricsFromReadme,
	extractMetricsFromSvg,
	GATE_THRESHOLDS,
	injectReadme,
	renderBadgeSvg,
	renderReadmeBlock,
	textWidth,
} from "../../scripts/coverage-badge.mjs";

const SUMMARY = {
	total: {
		lines: { total: 100, covered: 90, skipped: 0, pct: 90.37 },
		statements: { total: 120, covered: 104, skipped: 0, pct: 86.67 },
		branches: { total: 60, covered: 54, skipped: 0, pct: 90.0 },
		functions: { total: 50, covered: 40, skipped: 0, pct: 80.0 },
	},
};

describe("extractMetrics", () => {
	it("extrait les 4 métriques arrondies à l'entier", () => {
		expect(extractMetrics(SUMMARY)).toEqual({
			lines: 90,
			statements: 87,
			branches: 90,
			functions: 80,
		});
	});

	it("absorbe la variance de coverage entre plateformes (robustesse --check)", () => {
		// 90.37 vs 90.33 → même entier 90 : le badge ne dérive pas d'une plateforme à l'autre.
		const a = extractMetrics(SUMMARY);
		const b = extractMetrics({
			total: {
				lines: { pct: 90.33 },
				statements: { pct: 86.72 },
				branches: { pct: 89.96 },
				functions: { pct: 80.04 },
			},
		});
		expect(a).toEqual(b);
	});

	it("retourne null pour une métrique absente", () => {
		expect(extractMetrics({ total: { lines: {} } }).lines).toBeNull();
	});
});

describe("extractMetricsFromLabel", () => {
	it("parse les deux séparateurs (« , » et « · »)", () => {
		expect(
			extractMetricsFromLabel(
				"lines 90%, statements 87%, branches 90%, functions 80%",
			),
		).toEqual({ lines: 90, statements: 87, branches: 90, functions: 80 });
		expect(
			extractMetricsFromLabel(
				"lines 90% · statements 87% · branches 90% · functions 80%",
			),
		).toEqual({ lines: 90, statements: 87, branches: 90, functions: 80 });
	});

	it("retourne null si une métrique manque ou est illisible", () => {
		expect(extractMetricsFromLabel("lines 90%")).toBeNull();
		expect(extractMetricsFromLabel("")).toBeNull();
		expect(extractMetricsFromLabel(undefined)).toBeNull();
	});
});

describe("extractMetricsFromSvg / extractMetricsFromReadme", () => {
	const svg = renderBadgeSvg(extractMetrics(SUMMARY));
	const block = renderReadmeBlock(extractMetrics(SUMMARY));

	it("relit les métriques depuis l'aria-label du SVG", () => {
		expect(extractMetricsFromSvg(svg)).toEqual(extractMetrics(SUMMARY));
	});

	it("relit les métriques depuis l'alt du bloc README", () => {
		expect(extractMetricsFromReadme(block)).toEqual(extractMetrics(SUMMARY));
	});

	it("retourne null sur un artefact illisible", () => {
		expect(extractMetricsFromSvg("<svg/>")).toBeNull();
		expect(extractMetricsFromReadme("no badge here")).toBeNull();
	});
});

describe("coverageDrift", () => {
	const committed = { lines: 90, statements: 87, branches: 90, functions: 80 };

	it("aucun drift quand les métriques sont identiques", () => {
		expect(coverageDrift(committed, committed)).toEqual([]);
	});

	it("tolère ±1 point (variance v8 au seuil d'arrondi)", () => {
		expect(coverageDrift(committed, { ...committed, statements: 88 })).toEqual(
			[],
		);
		expect(coverageDrift(committed, { ...committed, lines: 89 })).toEqual([]);
	});

	it("signale un écart ≥ 2 points (vrai recul de coverage)", () => {
		expect(coverageDrift(committed, { ...committed, statements: 85 })).toEqual([
			"statements",
		]);
	});

	it("signale un changement de nullité", () => {
		expect(coverageDrift(committed, { ...committed, branches: null })).toEqual([
			"branches",
		]);
		expect(coverageDrift(null, committed)).toEqual([
			"lines",
			"statements",
			"branches",
			"functions",
		]);
	});
});

describe("textWidth", () => {
	it("grandit avec la longueur du texte", () => {
		expect(textWidth("a")).toBeLessThan(textWidth("statements"));
	});
});

describe("renderBadgeSvg", () => {
	const svg = renderBadgeSvg(extractMetrics(SUMMARY));

	it("est un SVG autonome accessible", () => {
		expect(svg.startsWith("<svg")).toBe(true);
		expect(svg).toContain('role="img"');
		expect(svg).toContain("HookStack coverage —");
	});

	it("affiche les 4 métriques avec leur valeur entière", () => {
		expect(svg).toContain(">lines</text>");
		expect(svg).toContain(">statements</text>");
		expect(svg).toContain(">branches</text>");
		expect(svg).toContain(">functions</text>");
		expect(svg).toContain(">90%</text>");
		expect(svg).toContain(">87%</text>");
		expect(svg).toContain(">80%</text>");
	});

	it("colore en vert les métriques ≥ seuil, en rouge celles sous le seuil", () => {
		// lines 90 ≥ 80 → vert ; functions 80 ≥ 75 → vert (seuil fonctions = 75).
		expect(svg).toContain('fill="#3fb950"');
		expect(svg).not.toContain('fill="#f85149"');
	});

	it("colore en rouge une métrique sous le seuil", () => {
		const low = renderBadgeSvg({
			lines: 79,
			statements: 60,
			branches: 50,
			functions: 40,
		});
		expect(low).toContain('fill="#f85149"');
		expect(low).not.toContain('fill="#3fb950"');
	});

	it("affiche un tiret pour une métrique inconnue", () => {
		const svg = renderBadgeSvg({
			lines: null,
			statements: null,
			branches: null,
			functions: null,
		});
		expect(svg).toContain(">—</text>");
	});
});

describe("renderReadmeBlock", () => {
	const block = renderReadmeBlock(extractMetrics(SUMMARY));

	it("encadre le bloc entre les marqueurs", () => {
		expect(block.startsWith("<!-- COVERAGE_BADGE:START -->")).toBe(true);
		expect(block.endsWith("<!-- COVERAGE_BADGE:END -->")).toBe(true);
	});

	it("référence le SVG public avec un alt descriptif", () => {
		expect(block).toContain('src="public/coverage-badge.svg"');
		expect(block).toContain(
			'alt="HookStack coverage — lines 90% · statements 87% · branches 90% · functions 80%"',
		);
	});

	it("rappelle les seuils du gate", () => {
		expect(block).toContain(
			"lines/statements/branches ≥ 80 %, functions ≥ 75 %",
		);
	});
});

describe("injectReadme", () => {
	const block = renderReadmeBlock(extractMetrics(SUMMARY));

	it("insère le bloc dans le hero avant la démo GIF lors de la première exécution", () => {
		const readme =
			'# T\n\n[![badge](x)](y)\n\n<img src="doc/assets/demo-hookstack.gif" alt="demo"/>\n\n## Promise\n';
		const out = injectReadme(readme, block);
		expect(out.indexOf("COVERAGE_BADGE:START")).toBeLessThan(
			out.indexOf("doc/assets/demo-hookstack.gif"),
		);
		expect(out.indexOf("COVERAGE_BADGE:START")).toBeGreaterThan(
			out.indexOf("[![badge](x)](y)"),
		);
	});

	it("replie avant le premier titre si le GIF démo est absent", () => {
		const out = injectReadme("# T\n\n## Promise\n\nbody\n", block);
		expect(out.indexOf("COVERAGE_BADGE:START")).toBeLessThan(
			out.indexOf("## Promise"),
		);
	});

	it("remplace un bloc existant en place (forme idempotente)", () => {
		const first = injectReadme("# T\n\n## Promise\n\nbody\n", block);
		const second = injectReadme(first, block);
		expect(second).toBe(first);
		expect((second.match(/COVERAGE_BADGE:START/g) || []).length).toBe(1);
	});

	it("expose les seuils du gate via GATE_THRESHOLDS", () => {
		expect(GATE_THRESHOLDS).toEqual({
			lines: 80,
			statements: 80,
			branches: 80,
			functions: 75,
		});
	});
});
