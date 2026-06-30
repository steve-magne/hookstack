// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/stop-okf-staleness-check.mjs";

describe("stop-okf-staleness-check", () => {
	it("no-op quand le bundle est frais", () => {
		const deps = {
			exists: vi.fn(() => true),
			exec: vi.fn(() => "OK: derniere entree log.md = 2026-06-29 (1j <= 14j)."),
		};
		expect(run({}, deps)).toBeNull();
	});

	it("no-op quand okf.mjs / log.md absents", () => {
		const deps = {
			exists: vi.fn(() => false),
			exec: vi.fn(),
		};
		expect(run({}, deps)).toBeNull();
	});

	it("rappelle d'enrichir quand le bundle est périmé", () => {
		const deps = {
			exists: vi.fn(() => true),
			exec: vi.fn(() => "STALE: derniere entree log.md = 2026-05-01 (60j > 14j)."),
		};
		const r = run({}, deps);
		expect(r?.message).toContain("okf-staleness");
		expect(r?.message).toContain("enrichir");
	});
});
