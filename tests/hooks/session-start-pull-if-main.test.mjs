// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/session-start-pull-if-main.mjs";

describe("session-start-pull-if-main", () => {
	it("retourne null hors de main", () => {
		expect(run({ exec: () => "feature" })).toBeNull();
	});
	it("signale une divergence", () => {
		const exec = (cmd) => {
			if (cmd.includes("show-current")) return "main";
			if (cmd.includes("remote")) return "origin";
			if (cmd === "git rev-parse HEAD") return "aaa";
			if (cmd.includes("@{u}") && cmd.includes("rev-parse")) return "bbb";
			if (cmd.includes("HEAD..@{u}")) return "2";
			if (cmd.includes("@{u}..HEAD")) return "1";
			return "";
		};
		expect(run({ exec, pull: vi.fn() })).toContain("diverge");
	});
	it("pull en avance pure", () => {
		const exec = (cmd) => {
			if (cmd.includes("show-current")) return "main";
			if (cmd.includes("remote")) return "origin";
			if (cmd === "git rev-parse HEAD") return "aaa";
			if (cmd.includes("@{u}") && cmd.includes("rev-parse")) return "bbb";
			if (cmd.includes("HEAD..@{u}")) return "3";
			if (cmd.includes("@{u}..HEAD")) return "0";
			return "";
		};
		const pull = vi.fn();
		const out = run({ exec, pull });
		expect(pull).toHaveBeenCalled();
		expect(out).toContain("synchronisé");
	});
});
