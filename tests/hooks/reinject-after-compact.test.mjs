// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/reinject-after-compact.mjs";

describe("reinject-after-compact", () => {
	it("réinjecte le backup de la session courante", () => {
		const deps = {
			exists: () => true,
			readFile: () =>
				JSON.stringify({ summary: "Résumé précédent", saved_at: "2026-06-02" }),
			readdir: () => [],
			backupDir: "/bk",
		};
		const out = run({ session_id: "s1" }, deps);
		expect(out).toContain("Résumé précédent");
		expect(out).toContain("2026-06-02");
	});

	it("retombe sur le backup le plus récent si pas de session", () => {
		const deps = {
			exists: (p) => p === "/bk" || p.endsWith("recent.json"),
			readdir: () => ["recent.json"],
			readFile: () =>
				JSON.stringify({ summary: "Le plus récent", saved_at: "x" }),
			backupDir: "/bk",
		};
		expect(run({ session_id: "" }, deps)).toContain("Le plus récent");
	});

	it("retourne null si le dossier de backup est absent", () => {
		expect(
			run({ session_id: "s1" }, { exists: () => false, backupDir: "/bk" }),
		).toBeNull();
	});

	it("retourne null si aucun backup", () => {
		const deps = {
			exists: (p) => p === "/bk",
			readdir: () => [],
			backupDir: "/bk",
		};
		expect(run({ session_id: "" }, deps)).toBeNull();
	});

	it("ignore un backup corrompu", () => {
		const deps = {
			exists: () => true,
			readFile: () => "pas du json",
			readdir: () => [],
			backupDir: "/bk",
		};
		expect(run({ session_id: "s1" }, deps)).toBeNull();
	});
});
