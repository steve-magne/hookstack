// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/instructions-loaded-audit-log.mjs";

const TS = "2026-06-02T00:00:00.000Z";
const base = () => ({
	append: vi.fn(),
	mkdir: vi.fn(),
	now: () => TS,
	projectDir: "/proj",
	home: "/home",
});

describe("instructions-loaded-audit-log", () => {
	it("construit une ligne d'audit", () => {
		const line = run(
			{
				memory_type: "project",
				load_reason: "startup",
				file_path: "CLAUDE.md",
			},
			base(),
		);
		expect(line).toContain("project");
		expect(line).toContain("CLAUDE.md");
	});
});
