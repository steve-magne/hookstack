// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/reload-direnv.mjs";

describe("reload-direnv", () => {
	it("recharge si .envrc présent", () => {
		const exec = vi.fn();
		const r = run({ cwd: "/p" }, { exec, exists: () => true });
		expect(exec).toHaveBeenCalledWith("direnv allow .", "/p");
		expect(r.message).toContain("rechargé");
	});
	it("ignore si pas de .envrc", () => {
		expect(
			run({ cwd: "/p" }, { exec: vi.fn(), exists: () => false }),
		).toBeNull();
	});
});
