// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/java-format.mjs";
import { makeExecFail } from "./_utils.mjs";

describe("java-format", () => {
	it("ignore les fichiers non-.java", () => {
		const exec = vi.fn();
		expect(run({ tool_input: { file_path: "a.kt" } }, { exec })).toBeNull();
		expect(exec).not.toHaveBeenCalled();
	});

	it("formate un fichier .java avec google-java-format", () => {
		const exec = vi.fn();
		run({ tool_input: { file_path: "Main.java" } }, { exec });
		expect(exec).toHaveBeenCalledWith(
			expect.stringContaining("google-java-format -i"),
		);
		expect(exec).toHaveBeenCalledWith(expect.stringContaining("Main.java"));
	});

	it("supporte le champ path en plus de file_path", () => {
		const exec = vi.fn();
		run({ tool_input: { path: "Service.java" } }, { exec });
		expect(exec).toHaveBeenCalledWith(expect.stringContaining("Service.java"));
	});

	it("retourne null si le format réussit", () => {
		expect(
			run({ tool_input: { file_path: "a.java" } }, { exec: vi.fn() }),
		).toBeNull();
	});

	it("remonte une erreur de parse (stdout) dans le message", () => {
		const result = run(
			{ tool_input: { file_path: "a.java" } },
			{ exec: makeExecFail("error: expected ';'") },
		);
		expect(result?.message).toContain("[java-format]");
		expect(result?.message).toContain("expected ';'");
	});

	it("retourne null si l'outil est absent (échec sans output)", () => {
		const exec = () => {
			throw new Error("google-java-format not found");
		};
		expect(run({ tool_input: { file_path: "a.java" } }, { exec })).toBeNull();
	});
});
