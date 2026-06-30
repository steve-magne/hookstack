import { describe, expect, it } from "vitest";
import type { Hook } from "@/types/hook";
import { matchThemes, THEMES, themeLabel } from "@/lib/themes";

function makeHook(overrides: Partial<Hook> = {}): Hook {
	return {
		slug: "x",
		name: "X",
		category: "security",
		hook_type: "PreToolUse",
		trigger: "Bash",
		description: "",
		use_cases: [],
		tags: [],
		implementation: { type: "settings_json", config: {} },
		...overrides,
	};
}

describe("matchThemes", () => {
	it("maps a secrets hook to the secrets theme", () => {
		expect(
			matchThemes(makeHook({ slug: "pre-bash-secret-detection", tags: ["secrets"] })),
		).toContain("secrets");
	});

	it("can map a single hook to several themes (OR semantics)", () => {
		const ids = matchThemes(
			makeHook({
				slug: "pre-bash-block-destructive",
				benefit: "Stops a disk-wiping shell command",
				tags: ["safety", "guardrail"],
			}),
		);
		expect(ids).toContain("safety");
	});

	it("returns no theme for an unmatched hook", () => {
		expect(matchThemes(makeHook({ slug: "notification-sound" }))).toEqual([]);
	});

	it("every theme id resolves to a curated label", () => {
		for (const t of THEMES) expect(themeLabel(t.id)).toBe(t.label);
	});
});
