// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/ruff-check.mjs";
import { makeExecFail } from "./_utils.mjs";

describe("ruff-check", () => {
	it("ignore les fichiers non-.py", () => {
		const exec = vi.fn();
		expect(run({ tool_input: { file_path: "a.js" } }, { exec })).toBeNull();
		expect(exec).not.toHaveBeenCalled();
	});

	it("appelle ruff check --fix sur un fichier .py", () => {
		const exec = vi.fn();
		run({ tool_input: { file_path: "main.py" } }, { exec });
		expect(exec).toHaveBeenCalledWith(
			expect.stringContaining("ruff check --fix"),
		);
		expect(exec).toHaveBeenCalledWith(expect.stringContaining("main.py"));
	});

	it("retourne null si ruff check réussit", () => {
		expect(
			run({ tool_input: { file_path: "a.py" } }, { exec: vi.fn() }),
		).toBeNull();
	});

	it("remonte les erreurs ruff dans le message", () => {
		const result = run(
			{ tool_input: { file_path: "a.py" } },
			{ exec: makeExecFail("E501 line too long") },
		);
		expect(result?.message).toContain("[ruff-check]");
		expect(result?.message).toContain("E501 line too long");
	});

	it("retourne null si ruff échoue sans stdout", () => {
		const exec = () => {
			throw new Error("uv not found");
		};
		expect(run({ tool_input: { file_path: "a.py" } }, { exec })).toBeNull();
	});
});
