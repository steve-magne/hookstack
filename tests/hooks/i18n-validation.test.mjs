// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/i18n-validation.mjs";

describe("i18n-validation", () => {
	it("retourne null si moins de 2 fichiers i18n", () => {
		expect(
			run({ exec: () => "./locales/fr.json", projectDir: "/p" }),
		).toBeNull();
	});
	it("détecte des clés manquantes", () => {
		const exec = () => "./locales/fr.json\n./locales/en.json";
		const readFile = (p) =>
			p.includes("fr.json") ? '{"a":1,"b":2}' : '{"a":1}';
		const r = run({ exec, readFile, projectDir: "/p" });
		expect(r.issues.length).toBeGreaterThan(0);
		expect(r.message).toContain("manque");
	});
	it("signale la cohérence", () => {
		const exec = () => "./locales/fr.json\n./locales/en.json";
		const readFile = () => '{"a":1}';
		const r = run({ exec, readFile, projectDir: "/p" });
		expect(r.issues).toHaveLength(0);
	});
	it("rend la main silencieusement si le find timeout (ETIMEDOUT)", () => {
		// Un Stop hook non bloquant ne doit pas crasher sur un find qui expire
		// (ex: node_modules de worktrees énormes). On rend null sans bruit.
		const exec = () => {
			throw new Error("spawnSync /bin/sh ETIMEDOUT");
		};
		expect(run({ exec, projectDir: "/p" })).toBeNull();
	});
});
