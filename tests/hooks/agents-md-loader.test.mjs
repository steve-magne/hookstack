// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/agents-md-loader.mjs";

describe("agents-md-loader", () => {
	it("charge le contenu d'AGENTS.md quand il existe", () => {
		const readFile = vi.fn().mockReturnValue("# Agents\n\nAgent config here.");
		const fileExists = vi.fn().mockReturnValue(true);
		const result = run({}, { projectDir: "/project", readFile, fileExists });
		expect(result?.hookSpecificOutput?.additionalContext).toBe(
			"# Agents\n\nAgent config here.",
		);
	});

	it("retourne le bon hookEventName", () => {
		const readFile = vi.fn().mockReturnValue("content");
		const fileExists = vi.fn().mockReturnValue(true);
		const result = run({}, { projectDir: "/project", readFile, fileExists });
		expect(result?.hookSpecificOutput?.hookEventName).toBe("SessionStart");
	});

	it("retourne null si AGENTS.md n'existe pas", () => {
		const fileExists = vi.fn().mockReturnValue(false);
		expect(run({}, { projectDir: "/project", fileExists })).toBeNull();
	});

	it("retourne null si AGENTS.md est vide", () => {
		const readFile = vi.fn().mockReturnValue("   \n  ");
		const fileExists = vi.fn().mockReturnValue(true);
		expect(
			run({}, { projectDir: "/project", readFile, fileExists }),
		).toBeNull();
	});

	it("retourne null si projectDir absent", () => {
		expect(run({}, { projectDir: undefined })).toBeNull();
	});
});
