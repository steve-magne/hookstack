// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/biome-check.mjs";
import { makeExecFail } from "./_utils.mjs";

describe("biome-check", () => {
	it("ignore les fichiers non-JS/TS/JSON", () => {
		expect(
			run({ tool_input: { file_path: "a.css" } }, { exec: vi.fn() }),
		).toBeNull();
	});
	it("vérifie aussi les fichiers JSON (ex. .claude/settings.json)", () => {
		const exec = vi.fn();
		run({ tool_input: { file_path: "a.json" } }, { exec });
		expect(exec).toHaveBeenCalled();
	});
	it("retourne null si biome passe", () => {
		expect(
			run({ tool_input: { file_path: "a.ts" } }, { exec: vi.fn() }),
		).toBeNull();
	});
	it("remonte les erreurs biome", () => {
		const r = run(
			{ tool_input: { file_path: "a.ts" } },
			{ exec: makeExecFail("1:1 error") },
		);
		expect(r?.message).toContain("Biome");
		expect(r?.message).toContain("1:1 error");
	});
});
