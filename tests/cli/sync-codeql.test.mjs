import { describe, expect, it } from "vitest";
import { aggregateAlerts, attachVerdicts } from "../../.claude/sync-codeql.mjs";

describe("aggregateAlerts", () => {
	it("returns empty object when no alerts", () => {
		expect(aggregateAlerts([])).toEqual({});
	});

	it("counts by security_severity_level", () => {
		const alerts = [
			{
				rule: { security_severity_level: "high" },
				most_recent_instance: { location: { path: ".claude/hooks/foo.mjs" } },
			},
			{
				rule: { security_severity_level: "medium" },
				most_recent_instance: { location: { path: ".claude/hooks/foo.mjs" } },
			},
			{
				rule: { security_severity_level: "critical" },
				most_recent_instance: { location: { path: ".claude/hooks/bar.mjs" } },
			},
		];
		const result = aggregateAlerts(alerts);
		expect(result["foo.mjs"]).toEqual({
			critical: 0,
			high: 1,
			medium: 1,
			low: 0,
		});
		expect(result["bar.mjs"]).toEqual({
			critical: 1,
			high: 0,
			medium: 0,
			low: 0,
		});
	});

	it("falls back to rule.severity when security_severity_level is absent", () => {
		const alerts = [
			{
				rule: { severity: "error" },
				most_recent_instance: { location: { path: ".claude/hooks/foo.mjs" } },
			},
			{
				rule: { severity: "warning" },
				most_recent_instance: { location: { path: ".claude/hooks/foo.mjs" } },
			},
		];
		const result = aggregateAlerts(alerts);
		expect(result["foo.mjs"]).toEqual({
			critical: 0,
			high: 1,
			medium: 1,
			low: 0,
		});
	});

	it("skips alerts without a path", () => {
		const alerts = [
			{ rule: { security_severity_level: "high" }, most_recent_instance: {} },
		];
		expect(aggregateAlerts(alerts)).toEqual({});
	});
});

describe("attachVerdicts", () => {
	const makeHook = (slug, script_path) => ({
		slug,
		implementation: { script_path, security: {} },
	});

	it("writes zero counts for hooks with no alerts", () => {
		const hooks = [makeHook("foo", ".claude/hooks/foo.mjs")];
		attachVerdicts(hooks, {}, "2026-01-01T00:00:00.000Z");
		expect(hooks[0].implementation.security.codeql).toEqual({
			critical: 0,
			high: 0,
			medium: 0,
			low: 0,
			scannedAt: "2026-01-01T00:00:00.000Z",
		});
	});

	it("writes found counts for hooks with alerts", () => {
		const hooks = [makeHook("foo", ".claude/hooks/foo.mjs")];
		const counts = { "foo.mjs": { critical: 0, high: 2, medium: 1, low: 0 } };
		attachVerdicts(hooks, counts, "2026-01-01T00:00:00.000Z");
		expect(hooks[0].implementation.security.codeql).toMatchObject({
			high: 2,
			medium: 1,
		});
	});

	it("skips hooks without a script_path", () => {
		const hooks = [{ slug: "no-path", implementation: {} }];
		attachVerdicts(hooks, {}, "2026-01-01T00:00:00.000Z");
		expect(hooks[0].implementation.security).toBeUndefined();
	});

	it("returns list of updated slugs", () => {
		const hooks = [
			makeHook("foo", ".claude/hooks/foo.mjs"),
			makeHook("bar", ".claude/hooks/bar.mjs"),
			{ slug: "no-path", implementation: {} },
		];
		const updated = attachVerdicts(hooks, {}, "2026-01-01T00:00:00.000Z");
		expect(updated).toEqual(["foo", "bar"]);
	});
});
