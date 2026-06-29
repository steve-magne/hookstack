// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/registry-validate-on-change.mjs";

const fail = (msg) => () => {
	const e = new Error("invalid");
	e.stderr = Buffer.from(msg);
	throw e;
};

describe("registry-validate-on-change", () => {
	it("ignore un fichier autre que registry.json", () => {
		const exec = vi.fn();
		expect(
			run({ file_path: "/p/src/a.ts" }, { exec, projectDir: "/p" }),
		).toBeNull();
		expect(exec).not.toHaveBeenCalled();
	});

	it("ignore si CLAUDE_PROJECT_DIR absent", () => {
		expect(
			run(
				{ file_path: "/p/registry/registry.json" },
				{ exec: vi.fn(), projectDir: undefined },
			),
		).toBeNull();
	});

	it("silencieux quand le registre est valide", () => {
		const exec = vi.fn(() => "✓ valide");
		expect(
			run(
				{ file_path: "/p/registry/registry.json" },
				{ exec, projectDir: "/p" },
			),
		).toBeNull();
		expect(exec).toHaveBeenCalledWith("/p");
	});

	it("remonte les erreurs de validation en contexte", () => {
		const r = run(
			{ file_path: "/p/registry/registry.json" },
			{
				exec: fail("✗ my-hook\n  · /benefit must be string"),
				projectDir: "/p",
			},
		);
		expect(r?.hookSpecificOutput?.hookEventName).toBe("FileChanged");
		expect(r?.hookSpecificOutput?.additionalContext).toContain("INVALID");
		expect(r?.hookSpecificOutput?.additionalContext).toContain("my-hook");
	});
});
