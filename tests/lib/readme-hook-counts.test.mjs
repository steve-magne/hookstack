import { describe, expect, it } from "vitest";
import {
	CLAIMS,
	computeDogfoodCount,
	computeFacts,
	extractClaim,
	generate,
	injectStatsBlock,
	pythonInvariantError,
	renderStatsBlock,
} from "../../scripts/readme-hook-counts.mjs";

// Fabrique un hook minimal du registre.
const hook = (overrides = {}) => ({
	slug: "h",
	default_on: true,
	stack: [],
	implementation: {},
	...overrides,
});

// Chemins réels des claims (le script résout des chemins absolus depuis la racine).
const fileOf = (idPart) => CLAIMS.find((c) => c.id.includes(idPart)).file;
const CLAUDE_FILE = fileOf("CLAUDE.md");
const ROOT_FILE = fileOf("README.md —");
const CLI_FILE = fileOf("packages/cli");
const MONETIZATION_FILE = fileOf("monetization");
const HOOK_101_FILE = fileOf("hook-101");
const VISION_FILE = fileOf("vision-produit");

describe("computeFacts", () => {
	it("retourne zéro partout sur un registre vide", () => {
		expect(computeFacts([])).toEqual({
			total: 0,
			defaultOn: 0,
			pythonDefault: 0,
			pythonPyVariants: 0,
			pythonFallback: 0,
			cataloguePyVariants: 0,
			stackTypescript: 0,
			stackPython: 0,
			stackJava: 0,
		});
	});

	it("compte le set Python par défaut = default_on ∩ (universel ∪ python)", () => {
		const facts = computeFacts([
			hook({
				slug: "u-py",
				stack: [],
				implementation: { python_script_path: "u.py" },
			}),
			hook({ slug: "u-nopy", stack: [], implementation: {} }),
			hook({
				slug: "py",
				stack: ["python"],
				implementation: { python_script_path: "p.py" },
			}),
			hook({ slug: "ts", stack: ["typescript"], implementation: {} }),
			hook({ slug: "java", stack: ["java"], implementation: {} }),
			hook({
				slug: "off",
				default_on: false,
				implementation: { python_script_path: "x.py" },
			}),
		]);
		expect(facts).toEqual({
			total: 6,
			defaultOn: 5, // u-py, u-nopy, py, ts, java — `off` est hors set
			pythonDefault: 3, // u-py, u-nopy, py
			pythonPyVariants: 2, // u-py, py
			pythonFallback: 1, // u-nopy
			cataloguePyVariants: 3, // u-py, py, off
			stackTypescript: 1,
			stackPython: 1,
			stackJava: 1,
		});
	});

	it("inclut les hooks multi-stack dans le set Python (some, pas every)", () => {
		const facts = computeFacts([
			hook({
				slug: "mixed",
				stack: ["typescript", "python"],
				implementation: {},
			}),
			hook({ slug: "ts-only", stack: ["typescript"], implementation: {} }),
		]);
		expect(facts.pythonDefault).toBe(1); // mixed (typescript+python)
		expect(facts.stackPython).toBe(1);
		expect(facts.stackTypescript).toBe(2);
	});

	it("ignore les hooks non-array", () => {
		expect(computeFacts(null).total).toBe(0);
		expect(computeFacts(null).pythonFallback).toBe(0);
	});
});

describe("computeDogfoodCount", () => {
	it("compte les scripts distincts référencés dans settings.json", () => {
		const settings = JSON.stringify({
			hooks: {
				Stop: [
					{
						hooks: [
							{ command: "node $CLAUDE_PROJECT_DIR/.claude/hooks/a.mjs" },
						],
					},
					{
						hooks: [
							{ command: "python3 $CLAUDE_PROJECT_DIR/.claude/hooks/b.py" },
						],
					},
					{
						hooks: [
							{ command: "node $CLAUDE_PROJECT_DIR/.claude/hooks/a.mjs" },
						],
					},
				],
			},
		});
		expect(computeDogfoodCount(settings)).toBe(2); // a + b, a en double
	});

	it("retourne 0 sur du contenu vide ou absent", () => {
		expect(computeDogfoodCount("")).toBe(0);
		expect(computeDogfoodCount(undefined)).toBe(0);
	});
});

describe("pythonInvariantError", () => {
	it("est null quand l'install Python est 100 % .py", () => {
		expect(
			pythonInvariantError({
				pythonDefault: 3,
				pythonPyVariants: 3,
				pythonFallback: 0,
			}),
		).toBeNull();
	});

	it("signale le fallback quand l'invariant casse", () => {
		const err = pythonInvariantError({
			pythonDefault: 3,
			pythonPyVariants: 2,
			pythonFallback: 1,
		});
		expect(err).toContain("1 hook(s) sans variante .py");
	});
});

describe("extractClaim", () => {
	const readmeClaim = CLAIMS.find((c) => c.id.includes("README.md —"));
	const cliClaim = CLAIMS.find((c) => c.id.includes("packages/cli"));
	const dogfoodClaim = CLAIMS.find((c) => c.id.includes("hook-101"));

	it("relit le compte depuis la phrase du README racine", () => {
		expect(
			extractClaim(
				"lands **63 hooks, 100 % as `.py`, zero `.mjs` fallback** (see the install summary).",
				readmeClaim,
			),
		).toBe(63);
	});

	it("relit le compte depuis la phrase du README CLI", () => {
		expect(
			extractClaim(
				"is **100 % `.py` — zero `.mjs` fallback** (63 Python hooks today — the summary).",
				cliClaim,
			),
		).toBe(63);
	});

	it("relit le compte dogfood (avec ou sans suffixe « + »)", () => {
		expect(
			extractClaim("autorise 62+ hooks dogfoodés sans dette", dogfoodClaim),
		).toBe(62);
		expect(
			extractClaim("autorise 93 hooks dogfoodés sans dette", dogfoodClaim),
		).toBe(93);
	});

	it("retourne null si la phrase a changé de forme", () => {
		expect(
			extractClaim("lands N hooks, no bold, no backticks", readmeClaim),
		).toBeNull();
		expect(extractClaim("(Python hooks today", cliClaim)).toBeNull();
		expect(
			extractClaim("hooks dogfoodés (sans nombre)", dogfoodClaim),
		).toBeNull();
	});
});

describe("renderStatsBlock", () => {
	const facts = {
		total: 105,
		defaultOn: 79,
		cataloguePyVariants: 76,
		stackTypescript: 18,
		stackPython: 5,
		stackJava: 4,
		dogfooded: 93,
	};

	it("encadre le bloc entre les marqueurs et cite tous les comptes", () => {
		const block = renderStatsBlock(facts);
		expect(block.startsWith("<!-- HOOK_COUNTS:START -->")).toBe(true);
		expect(block.endsWith("<!-- HOOK_COUNTS:END -->")).toBe(true);
		expect(block).toContain("105 hooks");
		expect(block).toContain("79 default");
		expect(block).toContain("76 .py variants");
		expect(block).toContain("TypeScript 18 · Python 5 · Java 4");
		expect(block).toContain("93 dogfooded");
	});

	it("est déterministe", () => {
		expect(renderStatsBlock(facts)).toBe(renderStatsBlock(facts));
	});
});

describe("injectStatsBlock", () => {
	const block = renderStatsBlock({
		total: 105,
		defaultOn: 79,
		cataloguePyVariants: 76,
		stackTypescript: 18,
		stackPython: 5,
		stackJava: 4,
		dogfooded: 93,
	});

	it("insère le bloc avant le premier titre ## au premier passage", () => {
		const out = injectStatsBlock("# T\n\n## Installation\n\nbody\n", block);
		expect(out.indexOf("HOOK_COUNTS:START")).toBeLessThan(
			out.indexOf("## Installation"),
		);
	});

	it("remplace un bloc existant en place (idempotent)", () => {
		const first = injectStatsBlock("# T\n\n## Installation\n\nbody\n", block);
		const second = injectStatsBlock(first, block);
		expect(second).toBe(first);
		expect((second.match(/HOOK_COUNTS:START/g) || []).length).toBe(1);
	});
});

describe("generate", () => {
	const registry = [
		hook({
			slug: "u1",
			stack: [],
			implementation: { python_script_path: "u1.py" },
		}),
		hook({
			slug: "u2",
			stack: [],
			implementation: { python_script_path: "u2.py" },
		}),
		hook({ slug: "ts", stack: ["typescript"], implementation: {} }),
	];
	const settings = JSON.stringify({
		hooks: {
			Stop: [
				{
					hooks: [{ command: "node $CLAUDE_PROJECT_DIR/.claude/hooks/u1.mjs" }],
				},
				{
					hooks: [{ command: "node $CLAUDE_PROJECT_DIR/.claude/hooks/u2.mjs" }],
				},
			],
		},
	});

	const FACTS = {
		total: 3,
		defaultOn: 3,
		pythonDefault: 2,
		pythonPyVariants: 2,
		pythonFallback: 0,
		cataloguePyVariants: 2,
		stackTypescript: 1,
		stackPython: 0,
		stackJava: 0,
		dogfooded: 2,
	};
	const STATS = renderStatsBlock(FACTS);

	const ROOT_PROSE =
		"Every hook … a default Python install currently lands **2 hooks, 100 % as `.py`, zero `.mjs` fallback** (see the install summary).\n";
	const ROOT_IN_SYNC = `${ROOT_PROSE}\n${STATS}\n`;
	const CLI_IN_SYNC =
		"Every hook … a default Python install is **100 % `.py` — zero `.mjs` fallback** (2 Python hooks today — the summary).\n";
	const CLAUDE_IN_SYNC =
		"Hooks actifs : 2 hooks du catalogue sont actifs sur ce projet, chacun avec un test.\n";
	const MONETIZATION_IN_SYNC =
		"valide le produit en dogfood (2 hooks actifs sur le repo lui-même) et assure la visibilité.\n";
	const HOOK_101_IN_SYNC =
		"C'est ce pattern qui autorise 2 hooks dogfoodés sans dette de confiance.\n";
	const VISION_IN_SYNC =
		"le fondateur est son propre premier beta-testeur (dogfood complet avec 2 hooks actifs)\n";

	const deps = (files) => ({
		loadRegistry: () => registry,
		readSettings: () => settings,
		readFile: (path) => files[path],
	});

	it("ne dérive pas quand les comptes et le bloc stats sont synchrones", () => {
		const files = {
			[CLAUDE_FILE]: CLAUDE_IN_SYNC,
			[ROOT_FILE]: ROOT_IN_SYNC,
			[CLI_FILE]: CLI_IN_SYNC,
			[MONETIZATION_FILE]: MONETIZATION_IN_SYNC,
			[HOOK_101_FILE]: HOOK_101_IN_SYNC,
			[VISION_FILE]: VISION_IN_SYNC,
		};
		const { facts, invariantError, drift, statsDrift, updated } = generate(
			deps(files),
		);
		expect(facts.pythonDefault).toBe(2);
		expect(facts.dogfooded).toBe(2);
		expect(invariantError).toBeNull();
		expect(drift).toEqual([]);
		expect(statsDrift).toBe(false);
		expect(updated[ROOT_FILE]).toBe(ROOT_IN_SYNC);
		expect(updated[HOOK_101_FILE]).toBe(HOOK_101_IN_SYNC);
	});

	it("détecte et corrige un compte périmé dans toutes les docs", () => {
		const files = {
			[CLAUDE_FILE]: CLAUDE_IN_SYNC.replace(
				"2 hooks du catalogue",
				"7 hooks du catalogue",
			),
			[ROOT_FILE]: ROOT_IN_SYNC.replace("**2 hooks", "**7 hooks"),
			[CLI_FILE]: CLI_IN_SYNC.replace("(2 Python hooks", "(7 Python hooks"),
			[MONETIZATION_FILE]: MONETIZATION_IN_SYNC.replace(
				"(2 hooks actifs",
				"(7 hooks actifs",
			),
			[HOOK_101_FILE]: HOOK_101_IN_SYNC.replace(
				"2 hooks dogfoodés",
				"7+ hooks dogfoodés",
			),
			[VISION_FILE]: VISION_IN_SYNC.replace(
				"avec 2 hooks actifs",
				"avec 7 hooks actifs",
			),
		};
		const { drift, statsDrift, updated } = generate(deps(files));
		expect(
			drift.map((d) => [d.claim.fact, d.type, d.committed, d.expected]),
		).toEqual([
			["dogfooded", "count", 7, 2],
			["pythonDefault", "count", 7, 2],
			["pythonDefault", "count", 7, 2],
			["dogfooded", "count", 7, 2],
			["dogfooded", "count", 7, 2],
			["dogfooded", "count", 7, 2],
		]);
		expect(statsDrift).toBe(false);
		expect(updated[ROOT_FILE]).toBe(ROOT_IN_SYNC);
		expect(updated[MONETIZATION_FILE]).toBe(MONETIZATION_IN_SYNC);
		expect(updated[HOOK_101_FILE]).toBe(HOOK_101_IN_SYNC);
	});

	it("signale un bloc stats périmé et le régénère", () => {
		const staleBlock = STATS.replace("3 hooks", "4 hooks");
		const files = {
			[CLAUDE_FILE]: CLAUDE_IN_SYNC,
			[ROOT_FILE]: `${ROOT_PROSE}\n${staleBlock}\n`,
			[CLI_FILE]: CLI_IN_SYNC,
			[MONETIZATION_FILE]: MONETIZATION_IN_SYNC,
			[HOOK_101_FILE]: HOOK_101_IN_SYNC,
			[VISION_FILE]: VISION_IN_SYNC,
		};
		const { drift, statsDrift, updated } = generate(deps(files));
		expect(drift).toEqual([]); // la prose est bonne, seul le bloc a dérivé
		expect(statsDrift).toBe(true);
		expect(updated[ROOT_FILE]).toBe(ROOT_IN_SYNC);
	});

	it("signale une phrase introuvable sans écrire le fichier", () => {
		const files = {
			[CLAUDE_FILE]: CLAUDE_IN_SYNC,
			[ROOT_FILE]: "la phrase a été reformulée sans nombre ancré\n",
			[CLI_FILE]: CLI_IN_SYNC,
			[MONETIZATION_FILE]: MONETIZATION_IN_SYNC,
			[HOOK_101_FILE]: HOOK_101_IN_SYNC,
			[VISION_FILE]: VISION_IN_SYNC,
		};
		const { drift, updated } = generate(deps(files));
		expect(drift).toEqual([
			{
				claim: expect.objectContaining({
					id: expect.stringContaining("README.md —"),
				}),
				type: "missing",
				committed: null,
				expected: 2,
			},
		]);
		// Le fichier dont la phrase manque n'est jamais écrit à moitié.
		expect(updated[ROOT_FILE]).toBeUndefined();
		expect(updated[CLI_FILE]).toBe(CLI_IN_SYNC);
	});

	it("signale l'invariant cassé (fallback > 0) et ne propose pas de réécrire la prose fausse", () => {
		const brokenRegistry = [
			hook({
				slug: "u1",
				stack: [],
				implementation: { python_script_path: "u1.py" },
			}),
			hook({ slug: "u2", stack: [], implementation: {} }), // pas de variante .py
		];
		const files = {
			[CLAUDE_FILE]: CLAUDE_IN_SYNC,
			[ROOT_FILE]: ROOT_IN_SYNC,
			[CLI_FILE]: CLI_IN_SYNC,
			[MONETIZATION_FILE]: MONETIZATION_IN_SYNC,
			[HOOK_101_FILE]: HOOK_101_IN_SYNC,
			[VISION_FILE]: VISION_IN_SYNC,
		};
		const { facts, invariantError } = generate({
			loadRegistry: () => brokenRegistry,
			readSettings: () => settings,
			readFile: (path) => files[path],
		});
		expect(facts.pythonFallback).toBe(1);
		expect(invariantError).toContain("100 % .py");
	});
});

describe("CLAIMS", () => {
	it("chaque claim a un fact, un pattern et un render cohérent", () => {
		for (const claim of CLAIMS) {
			expect(claim).toHaveProperty("id");
			expect(claim).toHaveProperty("fact");
			expect(claim.pattern).toBeInstanceOf(RegExp);
			const rendered = claim.render({
				pythonDefault: 42,
				pythonPyVariants: 42,
				pythonFallback: 0,
				dogfooded: 42,
			});
			expect(rendered).toContain("42");
			expect(extractClaim(rendered, claim)).toBe(42);
		}
	});
});
