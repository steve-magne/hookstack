// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/ruff-format.mjs";

describe("ruff-format", () => {
	it("ignore les fichiers non-.py", () => {
		const exec = vi.fn();
		expect(run({ tool_input: { file_path: "a.ts" } }, { exec })).toBeNull();
		expect(exec).not.toHaveBeenCalled();
	});

	it("appelle ruff format sur un fichier .py", () => {
		const exec = vi.fn();
		run({ tool_input: { file_path: "main.py" } }, { exec });
		expect(exec).toHaveBeenCalledWith(expect.stringContaining("ruff format"));
		expect(exec).toHaveBeenCalledWith(expect.stringContaining("main.py"));
	});

	it("retourne null si ruff format réussit", () => {
		expect(
			run({ tool_input: { file_path: "a.py" } }, { exec: vi.fn() }),
		).toBeNull();
	});

	it("retourne null si ruff est absent (non bloquant)", () => {
		const exec = vi.fn(() => {
			throw new Error("uv not found");
		});
		expect(run({ tool_input: { file_path: "a.py" } }, { exec })).toBeNull();
	});

	it("supporte le champ path en plus de file_path", () => {
		const exec = vi.fn();
		run({ tool_input: { path: "script.py" } }, { exec });
		expect(exec).toHaveBeenCalledWith(expect.stringContaining("script.py"));
	});
});
