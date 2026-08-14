// @vitest-environment node
// Tests du gate CI Python/JS test parity — scripts/check-python-coverage-parity.mjs.
// Injecte un mini-fs (counts via map path → string) et une registry réduite
// pour valider la logique de comptage + le déclenchement des échecs.
import { describe, expect, it } from "vitest";
import {
	countMjsTests,
	countPyTests,
	run,
	SURFACE_EXCEPTIONS,
} from "../../scripts/check-python-coverage-parity.mjs";

function mkFs(files) {
	return {
		exists: (p) => p in files,
		read: (p) => files[p],
	};
}

describe("countPyTests / countMjsTests", () => {
	it("countPyTests compte les `def test_*` en début de ligne", () => {
		const fs = mkFs({
			"x.py": "def test_a():\n    pass\n\n\ndef test_b():\n    pass\n",
		});
		expect(countPyTests("x.py", fs)).toBe(2);
	});

	it("countPyTests retourne 0 si le fichier n'existe pas", () => {
		expect(countPyTests("missing.py", mkFs({}))).toBe(0);
	});

	it("countMjsTests compte les `it(...)` de vitest", () => {
		const fs = mkFs({
			"x.test.mjs":
				'\tit("a", () => {})\n\n\tit("b", () => {})\n\n\tit("c", () => {})\n',
		});
		expect(countMjsTests("x.test.mjs", fs)).toBe(3);
	});

	it("countMjsTests retourne 0 si fichier absent", () => {
		expect(countMjsTests("missing.test.mjs", mkFs({}))).toBe(0);
	});
});

describe("run() — parité Python/JS", () => {
	const hooksDir = "/repo/.claude/hooks";
	const testsDir = "/repo/tests/hooks";

	// Helper : construit un mini-fs avec une paire .py + .mjs + leurs tests
	function makePair(slug, pyCount, mjsCount) {
		return {
			files: {
				[`${hooksDir}/${slug}.mjs`]: "// hook",
				[`${testsDir}/${slug}.test.mjs`]:
					Array.from(
						{ length: mjsCount },
						(_, i) => `\tit("test ${i}", () => {})`,
					).join("\n") + "\n",
				[`${testsDir}/test_${slug}.py`]:
					Array.from(
						{ length: pyCount },
						(_, i) => `def test_x_${i}():\n    pass\n`,
					).join("\n\n") + "\n",
			},
		};
	}

	function registryFor(slugs) {
		// hooks list — chaque entrée porte slug + implementation.python_script_path
		return slugs.map((slug) => ({
			slug,
			implementation: { python_script_path: `.claude/hooks/${slug}.py` },
		}));
	}

	it("Δ = 0 (même nombre de tests) : non-failing", () => {
		const pair = makePair("my-hook", 5, 5);
		const result = run({
			registry: registryFor(["my-hook"]),
			hooksDir,
			testsDir,
			exists: (p) => p in pair.files,
			read: (p) => pair.files[p],
		});
		expect(result.rows).toEqual([
			{ slug: "my-hook", cMjs: 5, cPy: 5, delta: 0 },
		]);
		expect(result.failing).toEqual([]);
		expect(result.excepted).toEqual([]);
	});

	it("Δ > 0 (Python a plus de tests) : non-failing", () => {
		const pair = makePair("my-hook", 8, 5);
		const result = run({
			registry: registryFor(["my-hook"]),
			hooksDir,
			testsDir,
			exists: (p) => p in pair.files,
			read: (p) => pair.files[p],
		});
		expect(result.rows[0].delta).toBe(3);
		expect(result.failing).toEqual([]);
	});

	it("Δ < 0 (Python a moins de tests) : failing, sauf surfaceException", () => {
		const pair = makePair("my-hook", 3, 7);
		const result = run({
			registry: registryFor(["my-hook"]),
			hooksDir,
			testsDir,
			exists: (p) => p in pair.files,
			read: (p) => pair.files[p],
		});
		expect(result.rows[0].delta).toBe(-4);
		expect(result.failing).toHaveLength(1);
		expect(result.failing[0].slug).toBe("my-hook");
		expect(result.excepted).toEqual([]);
	});

	it("Δ < 0 + surface exception : excepted, pas failing", () => {
		const pair = makePair("stop-quality-check", 3, 7);
		const result = run({
			registry: registryFor(["stop-quality-check"]),
			hooksDir,
			testsDir,
			exists: (p) => p in pair.files,
			read: (p) => pair.files[p],
		});
		expect(result.failing).toEqual([]);
		expect(result.excepted).toHaveLength(1);
		expect(result.excepted[0].slug).toBe("stop-quality-check");
	});

	it("hooks Python-only (sans .mjs) sont exclus du rapport", () => {
		// Registry avec python_script_path mais aucun .mjs sur disque → skip
		const result = run({
			registry: registryFor(["py-only-hook"]),
			hooksDir,
			testsDir,
			exists: () => false, // aucun fichier
			read: () => "",
		});
		expect(result.rows).toEqual([]);
	});

	it("hooks sans python_script_path sont exclus du rapport", () => {
		const result = run({
			registry: [{ slug: "js-only", implementation: {} }],
			hooksDir,
			testsDir,
			exists: () => false,
			read: () => "",
		});
		expect(result.rows).toEqual([]);
	});

	it("delta = -1 doit toujours échouer (pas d'arrondi)", () => {
		const pair = makePair("small-hook", 1, 2);
		const result = run({
			registry: registryFor(["small-hook"]),
			hooksDir,
			testsDir,
			exists: (p) => p in pair.files,
			read: (p) => pair.files[p],
		});
		expect(result.failing).toHaveLength(1);
	});
	it("les lignes sont triées par delta croissant", () => {
		const files = {};
		[
			makePair("good-hook", 10, 5),
			makePair("balanced-hook", 5, 5),
			makePair("bad-hook", 1, 10),
		].forEach((p) => {
			Object.assign(files, p.files);
		});
		const result = run({
			registry: registryFor(["good-hook", "balanced-hook", "bad-hook"]),
			hooksDir,
			testsDir,
			exists: (p) => p in files,
			read: (p) => files[p],
		});
		expect(result.rows.map((r) => r.slug)).toEqual([
			"bad-hook",
			"balanced-hook",
			"good-hook",
		]);
	});
});

describe("SURFACE_EXCEPTIONS", () => {
	// Garde anti-régression : si alguém retire les exceptions documentées
	// par erreur, le gate devient laxiste. Verrouille la liste actuelle.
	it("contient stop-quality-check (Python = gate ruff+pyright uniquement)", () => {
		expect(SURFACE_EXCEPTIONS.has("stop-quality-check")).toBe(true);
	});
});
