// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { isBiomeUnavailable, run } from "../../.claude/hooks/per-file-lint.mjs";

const COUNTER = "/tmp/.test-lint-counter";
const DISABLE = "/tmp/.test-lint-disable";

function makeOpts(overrides = {}) {
	return {
		counterFile: COUNTER,
		disableFile: DISABLE,
		exists: (p) => p !== DISABLE, // fichiers source présents, pas de désactivation
		readFile: () => "0",
		writeFile: vi.fn(),
		unlink: vi.fn(),
		exec: () => "",
		lint: () => null, // pass par défaut
		...overrides,
	};
}

const diffExec = (file) => (cmd) => {
	if (cmd.includes("merge-base")) return "abc";
	if (cmd.includes("rev-parse")) return "def";
	if (cmd.includes("diff")) return file;
	return "";
};

describe("per-file-lint", () => {
	it("exitCode 0 si le fichier de désactivation existe", () => {
		const stderrSpy = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		const r = run(makeOpts({ exists: (p) => p === DISABLE }));
		expect(r.exitCode).toBe(0);
		expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("SUSPENDU"));
		stderrSpy.mockRestore();
	});

	it("exitCode 0 si aucun fichier modifié", () => {
		expect(run(makeOpts({ exec: () => "" })).exitCode).toBe(0);
	});

	it("ignore les fichiers non-JS/TS", () => {
		const r = run(
			makeOpts({ exec: diffExec("README.md\nstyle.css"), lint: vi.fn() }),
		);
		expect(r.exitCode).toBe(0);
	});

	it("exitCode 0 si Biome passe", () => {
		expect(
			run(makeOpts({ exec: diffExec("src/a.ts"), lint: () => null })).exitCode,
		).toBe(0);
	});

	it("exitCode 2 si Biome échoue", () => {
		const r = run(
			makeOpts({
				exec: diffExec("src/a.ts"),
				lint: () => "1:1 error no-unused",
			}),
		);
		expect(r.exitCode).toBe(2);
		expect(r.message).toContain("src/a.ts");
	});

	it("incrémente le compteur à chaque échec", () => {
		const writeFile = vi.fn();
		run(
			makeOpts({
				exec: diffExec("src/a.ts"),
				lint: () => "err",
				readFile: () => "1",
				writeFile,
			}),
		);
		expect(writeFile).toHaveBeenCalledWith(COUNTER, "2");
	});

	it("auto-désactive après 3 échecs", () => {
		const writeFile = vi.fn();
		const r = run(
			makeOpts({
				exec: diffExec("src/a.ts"),
				lint: () => "err",
				readFile: () => "2",
				writeFile,
			}),
		);
		expect(r.message).toContain("AUTO-DISABLE");
		expect(writeFile).toHaveBeenCalledWith(DISABLE, "");
	});

	it("réinitialise le compteur si tout passe", () => {
		const unlink = vi.fn();
		run(makeOpts({ exec: diffExec("src/a.ts"), lint: () => null, unlink }));
		expect(unlink).toHaveBeenCalledWith(COUNTER);
	});

	it("ignore un fichier supprimé", () => {
		const lint = vi.fn();
		const r = run(
			makeOpts({
				exec: diffExec("src/gone.ts"),
				exists: (p) => p === COUNTER,
				lint,
			}),
		);
		expect(r.exitCode).toBe(0);
		expect(lint).not.toHaveBeenCalled();
	});
});

describe("isBiomeUnavailable", () => {
	it("détecte un binaire/module introuvable", () => {
		expect(isBiomeUnavailable("Cannot find module biome")).toBe(true);
		expect(
			isBiomeUnavailable("npm error could not determine executable to run"),
		).toBe(true);
		expect(isBiomeUnavailable("/bin/sh: biome: command not found")).toBe(true);
	});

	it("traite une sortie vide comme indisponible (skip prudent)", () => {
		expect(isBiomeUnavailable("")).toBe(true);
		expect(isBiomeUnavailable(undefined)).toBe(true);
	});

	it("ne masque PAS une vraie violation de lint", () => {
		expect(
			isBiomeUnavailable(
				"/src/a.ts:1:1 lint/correctness/noUnusedVariables  'x' is unused",
			),
		).toBe(false);
	});
});
