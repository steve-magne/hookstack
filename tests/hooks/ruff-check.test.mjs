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

	it("formate puis appelle ruff check --fix sur un fichier .py", () => {
		const exec = vi.fn();
		run({ tool_input: { file_path: "main.py" } }, { exec });
		expect(exec).toHaveBeenNthCalledWith(
			1,
			expect.stringContaining("ruff format"),
		);
		expect(exec).toHaveBeenNthCalledWith(
			2,
			expect.stringContaining("ruff check --fix"),
		);
		expect(exec).toHaveBeenLastCalledWith(expect.stringContaining("main.py"));
	});

	it("avale un échec de ruff format et continue sur check", () => {
		const exec = vi
			.fn()
			.mockImplementationOnce(() => {
				throw new Error("uv not found");
			});
		const r = run({ tool_input: { file_path: "main.py" } }, { exec });
		expect(r).toBeNull();
		expect(exec).toHaveBeenCalledTimes(2);
	});

	it("supporte le champ path en plus de file_path", () => {
		const exec = vi.fn();
		run({ tool_input: { path: "script.py" } }, { exec });
		expect(exec).toHaveBeenCalledWith(expect.stringContaining("script.py"));
	});

	it("retourne null si ruff check réussit", () => {
		expect(
			run({ tool_input: { file_path: "a.py" } }, { exec: vi.fn() }),
		).toBeNull();
	});

	it("remonte les erreurs ruff dans le message", () => {
		// 1er appel (format) OK, 2e (check) échoue avec du output.
		const exec = vi
			.fn()
			.mockImplementationOnce(() => {})
			.mockImplementationOnce(makeExecFail("E501 line too long"));
		const result = run({ tool_input: { file_path: "a.py" } }, { exec });
		expect(result?.message).toContain("[ruff-check]");
		expect(result?.message).toContain("E501 line too long");
	});

	it("retourne null si ruff check échoue sans stdout", () => {
		const exec = vi
			.fn()
			.mockImplementationOnce(() => {})
			.mockImplementationOnce(() => {
				throw new Error("uv not found");
			});
		expect(run({ tool_input: { file_path: "a.py" } }, { exec })).toBeNull();
	});
});
