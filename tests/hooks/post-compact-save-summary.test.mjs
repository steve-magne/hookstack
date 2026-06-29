// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/post-compact-save-summary.mjs";

describe("post-compact-save-summary", () => {
	it("journalise un résumé", () => {
		const append = vi.fn();
		const e = run(
			{ compact_summary: "résumé", trigger: "manual" },
			{ append, mkdir: vi.fn(), projectDir: "/p", now: () => "T" },
		);
		expect(e).toContain("résumé");
		expect(append).toHaveBeenCalled();
	});
	it("ignore un résumé vide", () => {
		expect(
			run({ compact_summary: "  " }, { append: vi.fn(), mkdir: vi.fn() }),
		).toBeNull();
	});
});
