// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/inject-datetime.mjs";

describe("inject-datetime", () => {
	it("retourne une ligne de date formatée (locale neutre)", () => {
		const out = run({ now: new Date(2026, 5, 2, 12, 0) });
		expect(out).toContain("Date et heure courantes :");
		expect(out).toContain("2026-06-02 12:00");
		expect(out.endsWith("\n")).toBe(true);
	});

	it("fonctionne sans argument", () => {
		expect(run()).toContain("Date et heure courantes :");
	});
});
