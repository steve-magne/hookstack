// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/session-start-stash-warning.mjs";

describe("session-start-stash-warning", () => {
	it("avertit pour un stash ancien", () => {
		const old = new Date(Date.now() - 10 * 86400000).toISOString();
		const exec = () => `stash@{0}|${old}|WIP`;
		expect(run({ exec })).toContain("Stashs Git oubliés");
	});
	it("retourne null sans stash", () => {
		expect(run({ exec: () => "" })).toBeNull();
	});
	it("retourne null si stash récent", () => {
		const recent = new Date().toISOString();
		expect(run({ exec: () => `stash@{0}|${recent}|WIP` })).toBeNull();
	});
});
