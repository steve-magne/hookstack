#!/usr/bin/env node
// Gate CI : vérifie que les tests unitaires Python (.py) couvrent au moins
// les mêmes scénarios que les tests unitaires JavaScript (.mjs) — pour les
// hooks qui existent dans les deux langages.
//
// But : éviter qu'une régression silencieuse rende la variante Python d'un
// hook moins testée que sa variante .mjs. Comme la CLI installe la variante
// .py sur les projets Python (`hookstack-cli install --stack=python`),
// chaque scénario couvert en JS doit l'être côté Python aussi — sinon les
// utilisateurs Python ne bénéficient pas du même filet de sécurité.
//
// Hooks à surface volontairement réduite
// -------------------------------------
// Certains hooks ont une variante Python structurellement plus étroite que
// leur équivalent .mjs (ex. `stop-quality-check` : ruff+pyright côté Python,
// tsc+biome+ruff+pyright côté JS). Pour ceux-là, le delta Δ est
// documenté : la cible n'est PAS « au moins autant de tests », mais
// « surface Python entièrement testée ». Ils sont listés dans SURFACE_EXCEPTIONS.
//
// Usage CLI :
//   node scripts/check-python-coverage-parity.mjs         # tableau human-readable
//   node scripts/check-python-coverage-parity.mjs --check # exit 1 si régression, 0 sinon
//   node scripts/check-python-coverage-parity.mjs --json  # sortie JSON
//
// Pattern run() + DI — testé par tests/lib/check-python-coverage-parity.test.mjs.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, "..");

const REGISTRY_PATH = resolve(ROOT, "registry/registry.json");
const HOOKS_DIR = resolve(ROOT, ".claude/hooks");
const TESTS_DIR = resolve(ROOT, "tests/hooks");

// Slugs où la variante Python est INTENTIONNELLEMENT plus étroite que la .mjs.
// Documenter ici le pourquoi (cf. CLAUDE.md « Ajouter un hook »).
//   - stop-quality-check : Python = gate ruff+pyright uniquement (projets pyproject).
//     La .mjs couvre en plus tsc+biome+gate mixte, hors scope Python.
export const SURFACE_EXCEPTIONS = new Set(["stop-quality-check"]);

export function countPyTests(
	file,
	{ exists = existsSync, read = readFileSync } = {},
) {
	if (!exists(file)) return 0;
	const content = read(file, "utf8");
	// Compte les `def test_*(...)` au début de ligne (indentation libre).
	return (content.match(/^def test_/gm) || []).length;
}

export function countMjsTests(
	file,
	{ exists = existsSync, read = readFileSync } = {},
) {
	if (!exists(file)) return 0;
	const content = read(file, "utf8");
	// Compte les blocs `it(...)` de vitest.
	return (content.match(/^\s*it\(/gm) || []).length;
}

/**
 * Calcule la parité Python/JS pour les hooks qui ont les deux variantes.
 * @param opts.registry — liste d'objets hook (forme registry.json).
 * @param opts.exists, opts.read — fs injectables (test).
 * @param opts.hooksDir, opts.testsDir — chemins vers les sources.
 * @param opts.surfaceExceptions — Set<String> de slugs à ne pas sanctionner.
 */
export function run({
	registry,
	exists = existsSync,
	read = readFileSync,
	hooksDir = HOOKS_DIR,
	testsDir = TESTS_DIR,
	surfaceExceptions = SURFACE_EXCEPTIONS,
} = {}) {
	const hooks = Array.isArray(registry) ? registry : Object.values(registry);

	const rows = [];
	for (const h of hooks) {
		if (!h.implementation?.python_script_path) continue;
		const slug = h.slug;
		const mjsHook = resolve(hooksDir, `${slug}.mjs`);
		if (!exists(mjsHook)) continue; // pure-Python hook, hors scope

		const pyTest = resolve(testsDir, `test_${slug}.py`);
		const mjsTest = resolve(testsDir, `${slug}.test.mjs`);
		const cMjs = countMjsTests(mjsTest, { exists, read });
		const cPy = countPyTests(pyTest, { exists, read });
		rows.push({ slug, cMjs, cPy, delta: cPy - cMjs });
	}

	rows.sort((a, b) => a.delta - b.delta);

	return {
		rows,
		failing: rows.filter((r) => r.delta < 0 && !surfaceExceptions.has(r.slug)),
		excepted: rows.filter((r) => r.delta < 0 && surfaceExceptions.has(r.slug)),
	};
}

/**
 * Formate la sortie human-readable du gate.
 */
export function formatResults({ rows, failing, excepted }) {
	const lines = [];
	lines.push("");
	lines.push("=== Python test parity gate (vs .mjs) ===");
	lines.push("");
	lines.push("Slug".padEnd(45) + " | JS | PY |  Δ | Status");
	lines.push("-".repeat(75));
	for (const r of rows) {
		let status = "✓";
		if (r.delta < 0) {
			status = SURFACE_EXCEPTIONS.has(r.slug) ? "⚠ excepted" : "✗ FAIL";
		}
		lines.push(
			r.slug.padEnd(45) +
				" | " +
				String(r.cMjs).padStart(2) +
				" | " +
				String(r.cPy).padStart(2) +
				" | " +
				String(r.delta).padStart(3) +
				" | " +
				status,
		);
	}
	lines.push("");

	if (excepted.length > 0) {
		lines.push("-- Surface exceptions (narrow-scope Python variants) --");
		for (const r of excepted) {
			lines.push("  ⚠ " + r.slug + " : Δ = " + r.delta);
		}
		if (failing.length === 0) {
			lines.push(
				"\nSi un de ces hooks élargit sa surface Python, retirer l'exception.",
			);
		}
		lines.push("");
	}

	lines.push(
		`Total : ${rows.length} hooks comparés, ${failing.length} en échec.`,
	);
	return lines.join("\n");
}

// ── CLI entry point ──
if (import.meta.url === `file://${process.argv[1]}`) {
	const CHECK = process.argv.includes("--check");
	const AS_JSON = process.argv.includes("--json");

	const reg = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
	const result = run({ registry: reg });

	if (AS_JSON) {
		process.stdout.write(JSON.stringify(result, null, 2));
		process.stdout.write("\n");
	} else {
		process.stdout.write(formatResults(result));
		process.stdout.write("\n");
	}

	if (CHECK) {
		if (result.failing.length > 0) {
			process.stderr.write(
				`\n✗ ${result.failing.length} hook(s) avec Δ négatif : la variante Python est moins testée que la .mjs.\n`,
			);
			process.stderr.write(
				"Étendre les tests Python jusqu'à Δ ≥ 0, ou ajouter le slug à SURFACE_EXCEPTIONS dans scripts/check-python-coverage-parity.mjs avec justification.\n",
			);
			process.exit(1);
		}
		process.exit(0);
	}
}
