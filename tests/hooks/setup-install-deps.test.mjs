// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/setup-install-deps.mjs";

describe("setup-install-deps", () => {
	it("installe via pnpm si lockfile présent", () => {
		const exec = vi.fn();
		const exists = (p) => p.endsWith("pnpm-lock.yaml");
		const r = run({ cwd: "/p" }, { exec, exists });
		expect(r.cmd).toBe("pnpm install --frozen-lockfile");
	});
	it("ignore si node_modules présent", () => {
		expect(
			run(
				{ cwd: "/p" },
				{ exec: vi.fn(), exists: (p) => p.endsWith("node_modules") },
			),
		).toBeNull();
	});
	it("retourne null sans manifeste", () => {
		expect(
			run({ cwd: "/p" }, { exec: vi.fn(), exists: () => false }),
		).toBeNull();
	});
});
