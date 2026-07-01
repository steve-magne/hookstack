// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/autoformat.mjs";
import { makeExecFail } from "./_utils.mjs";

describe("autoformat", () => {
	it("formate un fichier", () => {
		const exec = vi.fn();
		expect(
			run({ tool_input: { file_path: "a.ts" } }, { exec })?.formatted,
		).toBe("a.ts");
		expect(exec).toHaveBeenCalledWith(
			expect.stringContaining('biome check --write "a.ts"'),
		);
	});
	it("ignore l'absence de fichier", () => {
		expect(run({ tool_input: {} }, { exec: vi.fn() })).toBeNull();
	});
	it("avale une erreur biome", () => {
		expect(
			run({ tool_input: { file_path: "a.ts" } }, { exec: makeExecFail("") }),
		).toBeNull();
	});
});
