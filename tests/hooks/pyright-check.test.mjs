// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/pyright-check.mjs";
import { makeExecFail } from "./_utils.mjs";

describe("pyright-check", () => {
	it("ignore les fichiers non-.py", () => {
		const exec = vi.fn();
		expect(run({ tool_input: { file_path: "a.ts" } }, { exec })).toBeNull();
		expect(exec).not.toHaveBeenCalled();
	});

	it("appelle pyright sur un fichier .py", () => {
		const exec = vi.fn();
		run({ tool_input: { file_path: "main.py" } }, { exec });
		expect(exec).toHaveBeenCalledWith(expect.stringContaining("pyright"));
		expect(exec).toHaveBeenCalledWith(expect.stringContaining("main.py"));
	});

	it("retourne null si pyright passe", () => {
		expect(
			run({ tool_input: { file_path: "a.py" } }, { exec: vi.fn() }),
		).toBeNull();
	});

	it("remonte les erreurs pyright dans le message", () => {
		const result = run(
			{ tool_input: { file_path: "a.py" } },
			{ exec: makeExecFail('error: Type "str" is not assignable') },
		);
		expect(result?.message).toContain("[pyright]");
		expect(result?.message).toContain('Type "str"');
	});

	it("retourne null si pyright échoue sans stdout", () => {
		const exec = () => {
			throw new Error("uv not found");
		};
		expect(run({ tool_input: { file_path: "a.py" } }, { exec })).toBeNull();
	});
});
