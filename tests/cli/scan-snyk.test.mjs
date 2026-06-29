// @vitest-environment node
import { describe, expect, it } from "vitest";
import { attachVerdicts, parseSnykFindings } from "../../.claude/scan-snyk.mjs";

const sarif = {
	runs: [
		{
			results: [
				{
					level: "error",
					locations: [
						{ physicalLocation: { artifactLocation: { uri: "a.mjs" } } },
					],
				},
				{
					level: "warning",
					locations: [
						{ physicalLocation: { artifactLocation: { uri: "a.mjs" } } },
					],
				},
				{
					level: "note",
					locations: [
						{ physicalLocation: { artifactLocation: { uri: "b.mjs" } } },
					],
				},
				{
					level: "error",
					locations: [
						{ physicalLocation: { artifactLocation: { uri: "dir/b.mjs" } } },
					],
				},
			],
		},
	],
};

describe("parseSnykFindings", () => {
	it("compte par fichier et par sévérité", () => {
		const c = parseSnykFindings(sarif);
		expect(c["a.mjs"]).toEqual({ high: 1, medium: 1, low: 0 });
	});
	it("regroupe par basename (ignore le dossier)", () => {
		const c = parseSnykFindings(sarif);
		expect(c["b.mjs"]).toEqual({ high: 1, medium: 0, low: 1 });
	});
	it("niveau inconnu → low", () => {
		const c = parseSnykFindings({
			runs: [
				{
					results: [
						{
							level: "mystery",
							locations: [
								{ physicalLocation: { artifactLocation: { uri: "x.mjs" } } },
							],
						},
					],
				},
			],
		});
		expect(c["x.mjs"].low).toBe(1);
	});
	it("SARIF vide → {}", () => {
		expect(parseSnykFindings({})).toEqual({});
		expect(parseSnykFindings(null)).toEqual({});
	});
});

describe("attachVerdicts", () => {
	it("attache un verdict à chaque hook avec code_snippet", () => {
		const hooks = [
			{ slug: "a", implementation: { code_snippet: "x" } },
			{ slug: "b", implementation: { code_snippet: "y" } },
		];
		const updated = attachVerdicts(
			hooks,
			{ "a.mjs": { high: 2, medium: 0, low: 0 } },
			"2026-06-03T00:00:00Z",
		);
		expect(updated).toEqual(["a", "b"]);
		expect(hooks[0].implementation.security.snyk).toEqual({
			high: 2,
			medium: 0,
			low: 0,
			scannedAt: "2026-06-03T00:00:00Z",
		});
	});
	it("hook propre (sans finding) → 0/0/0", () => {
		const hooks = [{ slug: "b", implementation: { code_snippet: "y" } }];
		attachVerdicts(hooks, {}, "T");
		expect(hooks[0].implementation.security.snyk).toEqual({
			high: 0,
			medium: 0,
			low: 0,
			scannedAt: "T",
		});
	});
	it("ignore les hooks sans code_snippet", () => {
		const hooks = [{ slug: "c", implementation: {} }];
		expect(attachVerdicts(hooks, {}, "T")).toEqual([]);
		expect(hooks[0].implementation.security).toBeUndefined();
	});
});
