// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/typecheck.mjs";
import { makeExecFail } from "./_utils.mjs";

describe("typecheck", () => {
	it("ignore les fichiers non-TS", () => {
		expect(
			run(
				{ tool_input: { file_path: "a.js" } },
				{ exec: vi.fn(), projectDir: "/p" },
			),
		).toBeNull();
	});
	it("remonte les erreurs tsc", () => {
		const r = run(
			{ tool_input: { file_path: "a.ts" } },
			{ exec: makeExecFail("TS2322"), projectDir: "/p" },
		);
		expect(r?.message).toContain("TypeScript");
	});
});
