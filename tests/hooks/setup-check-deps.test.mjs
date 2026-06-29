// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/setup-check-deps.mjs";

describe("setup-check-deps", () => {
	it("avertit si node_modules absent", () => {
		const exists = (p) => p.endsWith("pnpm-lock.yaml");
		const r = run({ exists, stat: () => ({ mtimeMs: 0 }), projectDir: "/p" });
		expect(r.warnings.length).toBe(1);
		expect(r.message).toContain("absent");
	});
	it("avertit si lockfile plus récent", () => {
		const exists = (p) =>
			p.endsWith("pnpm-lock.yaml") || p.endsWith("node_modules");
		const stat = (p) => ({ mtimeMs: p.endsWith("pnpm-lock.yaml") ? 100 : 50 });
		expect(run({ exists, stat, projectDir: "/p" }).warnings.length).toBe(1);
	});
	it("rien si à jour", () => {
		const exists = (p) =>
			p.endsWith("pnpm-lock.yaml") || p.endsWith("node_modules");
		const stat = () => ({ mtimeMs: 100 });
		expect(run({ exists, stat, projectDir: "/p" }).warnings).toHaveLength(0);
	});
});
