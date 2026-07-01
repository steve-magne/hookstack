// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findI18nJson, run } from "../../.claude/hooks/i18n-validation.mjs";

describe("i18n-validation", () => {
	describe("findI18nJson (parcours natif)", () => {
		let dir;
		beforeEach(() => {
			dir = mkdtempSync(join(tmpdir(), "i18n-"));
		});
		afterEach(() => {
			dir = undefined;
		});

		it("ignore node_modules, .git et .claude/worktrees (cause du timeout)", () => {
			mkdirSync(join(dir, "src", "locales"), { recursive: true });
			writeFileSync(join(dir, "src", "locales", "fr.json"), '{"a":1}');
			writeFileSync(join(dir, "src", "locales", "en.json"), '{"a":1}');
			mkdirSync(join(dir, "node_modules", "pkg", "locales"), {
				recursive: true,
			});
			writeFileSync(
				join(dir, "node_modules", "pkg", "locales", "fr.json"),
				'{"a":1}',
			);
			mkdirSync(join(dir, ".claude", "worktrees", "x", "src", "locales"), {
				recursive: true,
			});
			writeFileSync(
				join(dir, ".claude", "worktrees", "x", "src", "locales", "fr.json"),
				'{"a":1}',
			);
			mkdirSync(join(dir, ".git", "messages"), { recursive: true });
			writeFileSync(join(dir, ".git", "messages", "en.json"), '{"a":1}');

			const found = findI18nJson(dir);
			expect(found).toContain("./src/locales/fr.json");
			expect(found).toContain("./src/locales/en.json");
			expect(found).not.toContain("./node_modules/pkg/locales/fr.json");
			expect(found.some((f) => f.includes(".claude"))).toBe(false);
			expect(found.some((f) => f.includes(".git"))).toBe(false);
		});

		it("ne remonte rien hors d'un dossier locales/messages/i18n", () => {
			writeFileSync(join(dir, "package.json"), '{"a":1}');
			expect(findI18nJson(dir)).toHaveLength(0);
		});
	});

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
