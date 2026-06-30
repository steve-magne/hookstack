// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/okf-staleness-check.mjs";

describe("okf-staleness-check", () => {
	it("no-op si scripts/okf.mjs absent", () => {
		const exec = vi.fn();
		const exists = vi.fn((p) => !p.includes("okf.mjs"));
		expect(run({ exec, exists })).toBeNull();
		expect(exec).not.toHaveBeenCalled();
	});

	it("no-op si okf/log.md absent", () => {
		const exec = vi.fn();
		const exists = vi.fn((p) => p !== "okf/log.md");
		expect(run({ exec, exists })).toBeNull();
	});

	it("no-op (frais) quand stale renvoie OK", () => {
		const exists = vi.fn(() => true);
		const exec = vi.fn(() => "OK: derniere entree log.md = 2026-06-29 (1j <= 14j).");
		expect(run({ exec, exists })).toBeNull();
	});

	it("injecte une consigne d'enrichissement quand stale renvoie STALE", () => {
		const exists = vi.fn(() => true);
		const exec = vi.fn(() => "STALE: derniere entree log.md = 2026-06-01 (29j > 14j).");
		const out = run({ exec, exists });
		expect(out).toContain("OKF");
		expect(out).toContain("STALE");
		expect(out).toContain("okf-librarian");
	});
});
