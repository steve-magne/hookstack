// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/inject-deps-versions.mjs";

// deps : map chemin -> contenu (présence = existence)
const deps = (files) => ({
	cwd: "/proj",
	fileExists: vi.fn((p) => p in files),
	readFile: vi.fn((p) => files[p]),
});

describe("inject-deps-versions", () => {
	it("injecte les versions depuis package.json", () => {
		const out = run(
			deps({
				"/proj/package.json": JSON.stringify({
					dependencies: { next: "15.0.0" },
					devDependencies: { vitest: "^2.1.0" },
				}),
			}),
		);
		expect(out).toContain("next@15.0.0");
		expect(out).toContain("vitest@^2.1.0");
	});

	it("extrait les dépendances pyproject.toml", () => {
		const out = run(
			deps({
				"/proj/pyproject.toml":
					'dependencies = [\n  "fastapi>=0.110",\n  "httpx",\n]\n',
			}),
		);
		expect(out).toContain("fastapi>=0.110");
	});

	it("retourne null sans manifeste", () => {
		expect(run(deps({}))).toBeNull();
	});

	it("survit à un package.json invalide", () => {
		expect(run(deps({ "/proj/package.json": "{not json" }))).toBeNull();
	});

	it("borne la sortie à 60 entrées", () => {
		const many = Object.fromEntries(
			Array.from({ length: 80 }, (_, i) => [`pkg${i}`, "1.0.0"]),
		);
		const out = run(
			deps({ "/proj/package.json": JSON.stringify({ dependencies: many }) }),
		);
		expect(out).toContain("+20 more");
	});
});
