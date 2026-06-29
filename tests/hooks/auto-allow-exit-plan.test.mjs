// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/auto-allow-exit-plan.mjs";

describe("auto-allow-exit-plan", () => {
	it("autorise exit_plan_mode", () => {
		const r = run({ tool_name: "exit_plan_mode" });
		expect(r?.hookSpecificOutput?.decision?.behavior).toBe("allow");
	});

	it("lit aussi le champ tool", () => {
		const r = run({ tool: "exit_plan_mode" });
		expect(r?.hookSpecificOutput?.decision?.behavior).toBe("allow");
	});

	it("ignore les autres outils", () => {
		expect(run({ tool_name: "Bash" })).toBeNull();
	});
});
