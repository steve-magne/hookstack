// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/node-version-check.mjs";

const deps = (files, nodeVersion) => ({
	cwd: "/proj",
	nodeVersion,
	fileExists: vi.fn((p) => p in files),
	readFile: vi.fn((p) => files[p]),
});

describe("node-version-check", () => {
	it("avertit si .nvmrc ne correspond pas à la version active", () => {
		const out = run(deps({ "/proj/.nvmrc": "20\n" }, "v18.19.0"));
		expect(out).toContain("mismatch");
		expect(out).toContain("20");
	});

	it("reste silencieux si .nvmrc correspond", () => {
		expect(run(deps({ "/proj/.nvmrc": "v20.11.1" }, "v20.0.0"))).toBeNull();
	});

	it("utilise engines.node de package.json", () => {
		const out = run(
			deps(
				{ "/proj/package.json": JSON.stringify({ engines: { node: ">=22" } }) },
				"v20.0.0",
			),
		);
		expect(out).toContain("22");
	});

	it("priorise .nvmrc sur package.json", () => {
		const out = run(
			deps(
				{
					"/proj/.nvmrc": "20",
					"/proj/package.json": JSON.stringify({ engines: { node: ">=18" } }),
				},
				"v18.0.0",
			),
		);
		expect(out).toContain("20");
	});

	it("retourne null sans contrainte de version", () => {
		expect(run(deps({}, "v20.0.0"))).toBeNull();
	});

	it("ignore une valeur .nvmrc non numérique (lts/iron)", () => {
		expect(run(deps({ "/proj/.nvmrc": "lts/iron\n" }, "v20.0.0"))).toBeNull();
	});
});
