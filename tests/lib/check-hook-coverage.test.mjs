// @vitest-environment node
// Tests du gate CI per-hook — scripts/check-hook-coverage.mjs.
// Injecte un résumé de coverage factice (clés = chemins absolus se terminant par
// `.claude/hooks/<file>`, comme produit par le reporter json-summary de vitest).
import { describe, expect, it } from "vitest";
import {
	EXCEPTIONS,
	LINE_THRESHOLD,
	run,
} from "../../scripts/check-hook-coverage.mjs";

const ABS = "/repo/.claude/hooks";
const mkSummary = (files) =>
	Object.fromEntries(
		files.map(([name, pct]) => [
			`${ABS}/${name}`,
			{
				lines: { pct },
				statements: { pct },
				branches: { pct },
				functions: { pct },
			},
		]),
	);

const ctx = (hooks, cov, { exceptions = [], threshold = 80 } = {}) => ({
	readDir: () => hooks,
	readFile: () => JSON.stringify(mkSummary(cov)),
	exists: () => true,
	exceptions,
	threshold,
});

describe("check-hook-coverage.mjs — gate CI per-hook", () => {
	it("passe quand tous les hooks sont ≥ 80 %", () => {
		const r = run(
			ctx(
				["a.mjs", "b.mjs"],
				[
					["a.mjs", 95],
					["b.mjs", 80],
				],
			),
		);
		expect(r.exitCode).toBe(0);
		expect(r.message).toContain("[OK] 2 hooks");
	});

	it("la vraie liste EXCEPTIONS ne crée ni orphelines ni périmées si tous les fichiers existent sous le seuil", () => {
		// Hooks du disque = les 16 exceptions réelles, tous à 60 % (légitime) +
		// un hook conforme. Aucune orpheline (fichiers présents), aucune périmée
		// (tous sous le seuil).
		const hooks = [...EXCEPTIONS, "ok.mjs"];
		const cov = [...EXCEPTIONS.map((f) => [f, 60]), ["ok.mjs", 95]];
		const r = run(ctx(hooks, cov, { exceptions: EXCEPTIONS }));
		expect(r.exitCode).toBe(0);
	});

	it("seuil par défaut = 80 (LINE_THRESHOLD)", () => {
		expect(LINE_THRESHOLD).toBe(80);
	});

	it("bloque un hook individuel sous 80 %", () => {
		const r = run(ctx(["a.mjs"], [["a.mjs", 71]], { exceptions: [] }));
		expect(r.exitCode).toBe(1);
		expect(r.message).toContain("a.mjs: 71.0%");
	});

	it("tolère un hook sous le seuil s'il est dans EXCEPTIONS", () => {
		const r = run(
			ctx(["legacy.mjs"], [["legacy.mjs", 60]], { exceptions: ["legacy.mjs"] }),
		);
		expect(r.exitCode).toBe(0);
		expect(r.message).toContain("1 exception");
	});

	it("échoue si coverage-summary.json manque", () => {
		const r = run({ ...ctx([], []), exists: () => false });
		expect(r.exitCode).toBe(1);
		expect(r.message).toContain("introuvable");
	});

	it("échoue si le résumé est du JSON invalide", () => {
		const r = run({ ...ctx([], []), readFile: () => "not json" });
		expect(r.exitCode).toBe(1);
		expect(r.message).toContain("illisible");
	});

	it("compte un hook absent du résumé comme non couvert (0 %)", () => {
		const r = run(ctx(["untested.mjs"], [], { exceptions: [] }));
		expect(r.exitCode).toBe(1);
		expect(r.message).toContain("untested.mjs: 0.0%");
	});

	it("un hook absent du résumé échoue même s'il est dans EXCEPTIONS", () => {
		const r = run(ctx(["legacy.mjs"], [], { exceptions: ["legacy.mjs"] }));
		expect(r.exitCode).toBe(1);
		expect(r.message).toContain("absent");
		expect(r.message).toContain("legacy.mjs");
	});

	it("exige le retrait d'une exception périmée (hook repassé ≥ seuil)", () => {
		const r = run(
			ctx(["legacy.mjs"], [["legacy.mjs", 92]], { exceptions: ["legacy.mjs"] }),
		);
		expect(r.exitCode).toBe(1);
		expect(r.message).toContain("périmée");
		expect(r.message).toContain("legacy.mjs: 92.0%");
	});

	it("exige le retrait d'une exception obsolète (fichier disparu)", () => {
		const r = run(
			ctx(["a.mjs"], [["a.mjs", 95]], { exceptions: ["ghost.mjs"] }),
		);
		expect(r.exitCode).toBe(1);
		expect(r.message).toContain("obsolète");
		expect(r.message).toContain("ghost.mjs");
	});

	it("échoue proprement si le dossier hooks est introuvable", () => {
		const r = run({
			...ctx([], []),
			readDir: () => {
				throw new Error("ENOENT");
			},
		});
		expect(r.exitCode).toBe(1);
		expect(r.message).toContain("introuvable");
	});
});
