// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/pre-compact-backup.mjs";

describe("pre-compact-backup", () => {
	it("sauvegarde le résumé", () => {
		const writeFile = vi.fn();
		const r = run(
			{ summary: "s", session_id: "s1" },
			{ writeFile, mkdir: vi.fn(), backupDir: "/bk", now: () => "T" },
		);
		expect(r.file).toBe("/bk/s1.json");
		expect(writeFile).toHaveBeenCalled();
	});
	it("ignore sans résumé", () => {
		expect(run({}, { writeFile: vi.fn(), mkdir: vi.fn() })).toBeNull();
	});
});
