// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/stop-force-implementation-doc.mjs";

function makeExec(modified = "", untracked = "") {
	return vi.fn((cmd) => {
		if (cmd.includes("diff")) return modified;
		if (cmd.includes("ls-files")) return untracked;
		return "";
	});
}

describe("stop-force-implementation-doc", () => {
	it("no-op quand git échoue (pas de dépôt)", () => {
		const exec = vi.fn(() => {
			throw new Error("not a git repo");
		});
		expect(run({}, { exec, projectDir: "/p" })).toBeNull();
	});

	it("no-op quand aucun fichier source modifié (seulement doc/config/lock)", () => {
		const exec = makeExec("README.md\npackage.json\npnpm-lock.yaml\n");
		expect(run({}, { exec, projectDir: "/p" })).toBeNull();
	});

	it("no-op quand le code ET un fichier okf/implementation/ sont modifiés", () => {
		const exec = makeExec(
			"src/app/page.tsx\nokf/implementation/my-feature.md\n",
		);
		expect(run({}, { exec, projectDir: "/p" })).toBeNull();
	});

	it("no-op si okf/implementation/ apparaît dans les untracked (nouveau fichier non stagé)", () => {
		const exec = makeExec(
			"src/app/page.tsx\n",
			"okf/implementation/my-feature.md\n",
		);
		expect(run({}, { exec, projectDir: "/p" })).toBeNull();
	});

	it("bloque (exit 2) si fichier .tsx modifié sans okf/implementation/", () => {
		const exec = makeExec("src/components/Header.tsx\nsrc/lib/hooks.ts\n");
		const r = run({}, { exec, projectDir: "/p" });
		expect(r?.exitCode).toBe(2);
		expect(r?.message).toContain("okf/implementation/");
	});

	it("bloque pour un fichier .mjs hors .claude/ (ex: packages/cli)", () => {
		const exec = makeExec("packages/cli/bin/core.mjs\n");
		const r = run({}, { exec, projectDir: "/p" });
		expect(r?.exitCode).toBe(2);
	});

	it("bloque pour un fichier .py applicatif", () => {
		const exec = makeExec("src/api/main.py\n");
		const r = run({}, { exec, projectDir: "/p" });
		expect(r?.exitCode).toBe(2);
	});

	it("ignore les fichiers dans .claude/ (hooks internes)", () => {
		const exec = makeExec(".claude/hooks/my-hook.mjs\n");
		expect(run({}, { exec, projectDir: "/p" })).toBeNull();
	});

	it("ignore les fichiers de test", () => {
		const exec = makeExec("tests/hooks/my-hook.test.mjs\n");
		expect(run({}, { exec, projectDir: "/p" })).toBeNull();
	});

	it("ignore les fichiers dans dist/", () => {
		const exec = makeExec("dist/index.js\n");
		expect(run({}, { exec, projectDir: "/p" })).toBeNull();
	});

	it("le message contient une instruction actionnable avec le chemin attendu", () => {
		const exec = makeExec("src/app/page.tsx\n");
		const r = run({}, { exec, projectDir: "/p" });
		expect(r?.message).toContain("<feature-name>.md");
		expect(r?.message).toContain("technical choices");
	});
});
