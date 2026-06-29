// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/session-dedup-autodisable.mjs";

describe("session-dedup-autodisable", () => {
	it("pose le marqueur .disabled pour un hook au seuil", () => {
		const writeFile = vi.fn();
		const deps = {
			exists: (p) => p === "/c", // dossier existe, marqueur absent
			readdir: () => ["a.counter"],
			readFile: () => "3",
			writeFile,
			counterDir: "/c",
		};
		const r = run(deps);
		expect(r.disabled).toEqual(["a"]);
		expect(writeFile).toHaveBeenCalledWith("/c/a.disabled", "");
		expect(r.message).toContain("désactivés");
	});

	it("ne réécrit pas un marqueur déjà posé", () => {
		const writeFile = vi.fn();
		const deps = {
			exists: () => true, // dossier ET marqueur existent
			readdir: () => ["a.counter"],
			readFile: () => "5",
			writeFile,
			counterDir: "/c",
		};
		expect(run(deps).disabled).toEqual(["a"]);
		expect(writeFile).not.toHaveBeenCalled();
	});

	it("retourne null sous le seuil", () => {
		const deps = {
			exists: (p) => p === "/c",
			readdir: () => ["a.counter"],
			readFile: () => "1",
			writeFile: vi.fn(),
			counterDir: "/c",
		};
		expect(run(deps)).toBeNull();
	});

	it("retourne null si pas de dossier", () => {
		expect(run({ exists: () => false, counterDir: "/c" })).toBeNull();
	});
});
