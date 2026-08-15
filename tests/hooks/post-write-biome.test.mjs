// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/post-write-biome.mjs";
import { makeExecFail } from "./_utils.mjs";

describe("post-write-biome", () => {
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
	it("formate ET linte en un seul passage (--write --error-on-warnings)", () => {
		const exec = vi.fn();
		run({ tool_input: { file_path: "a.ts" } }, { exec });
		expect(exec).toHaveBeenCalledWith(
			expect.stringContaining("biome check --write --error-on-warnings"),
		);
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
