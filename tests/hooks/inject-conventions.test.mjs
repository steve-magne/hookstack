// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/inject-conventions.mjs";

describe("inject-conventions", () => {
	it("injecte le contenu de agent-rules.md en priorité", () => {
		const deps = {
			exists: (p) => p.endsWith("agent-rules.md"),
			readFile: () => "Règle A",
			projectDir: "/proj",
		};
		const out = run(deps);
		expect(out).toContain("Conventions du projet");
		expect(out).toContain("Règle A");
	});

	it("retombe sur CONVENTIONS.md si agent-rules.md absent", () => {
		const deps = {
			exists: (p) => p.endsWith("CONVENTIONS.md"),
			readFile: () => "Règle B",
			projectDir: "/proj",
		};
		expect(run(deps)).toContain("Règle B");
	});

	it("retourne null si aucun fichier", () => {
		expect(run({ exists: () => false, projectDir: "/proj" })).toBeNull();
	});

	it("retourne null si fichier vide", () => {
		expect(
			run({ exists: () => true, readFile: () => "   ", projectDir: "/proj" }),
		).toBeNull();
	});
});
