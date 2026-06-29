// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/user-prompt-expansion-skill-context.mjs";

describe("user-prompt-expansion-skill-context", () => {
	it("injecte le contexte pour code-review", () => {
		const r = run({ command_name: "code-review" });
		expect(r?.hookSpecificOutput?.additionalContext).toContain("SOLID");
	});

	it("injecte le contexte pour security-review", () => {
		const r = run({ command_name: "security-review" });
		expect(r?.hookSpecificOutput?.additionalContext).toContain("OWASP");
	});

	it("retourne null pour un skill inconnu", () => {
		expect(run({ command_name: "other" })).toBeNull();
	});

	it("retourne null sans command_name", () => {
		expect(run({})).toBeNull();
	});
});
