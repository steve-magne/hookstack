// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/session-changelog.mjs";

const exec = (cmd) => {
	if (cmd.includes("branch")) return "main";
	if (cmd.includes("diff")) return " file | 2 +-";
	if (cmd.includes("log")) return "- fix (abc)";
	return "";
};

describe("session-changelog", () => {
	it("ajoute une entrée si CHANGELOG existe", () => {
		const append = vi.fn();
		const r = run({
			exec,
			append,
			exists: () => true,
			projectDir: "/p",
			now: () => "2026-06-02T00:00:00Z",
		});
		expect(r.written).toBe(true);
		expect(append).toHaveBeenCalled();
	});
	it("ignore si CHANGELOG absent", () => {
		const r = run({
			exec,
			append: vi.fn(),
			exists: () => false,
			projectDir: "/p",
			now: () => "2026-06-02T00:00:00Z",
		});
		expect(r.written).toBe(false);
	});
	it("retourne null sans diff ni commits", () => {
		expect(
			run({ exec: () => "", exists: () => true, projectDir: "/p" }),
		).toBeNull();
	});
});
