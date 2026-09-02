// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/stop-mobile-ui-test-gate.mjs";

function makeExec(modified = "", untracked = "") {
	return vi.fn((cmd) => {
		if (cmd.startsWith("git diff")) return modified;
		if (cmd.startsWith("git ls-files")) return untracked;
		return "";
	});
}

describe("stop-mobile-ui-test-gate", () => {
	it("no-op quand git échoue (pas de dépôt)", () => {
		const exec = vi.fn(() => {
			throw new Error("not a git repo");
		});
		expect(run(null, { exec, projectDir: "/p" })).toBeNull();
	});

	it("bloque quand un screen mobile change sans son test", () => {
		const exec = makeExec("apps/mobile/src/screens/ProfileScreen.tsx\n");
		const r = run(null, { exec, projectDir: "/p" });
		expect(r?.exitCode).toBe(2);
		expect(r?.message).toContain("ProfileScreen.tsx");
		expect(r?.message).toContain(
			"apps/mobile/tests/screens/ProfileScreen.test.tsx",
		);
	});

	it("laisse passer un screen mobile avec son test de régression ajusté", () => {
		const exec = makeExec(
			"apps/mobile/src/screens/ProfileScreen.tsx\napps/mobile/tests/screens/ProfileScreen.test.tsx\n",
		);
		expect(run(null, { exec, projectDir: "/p" })).toBeNull();
	});

	it("reconnaît la structure plate pour un composant niché (src/components/game/*)", () => {
		const exec = makeExec(
			"apps/mobile/src/components/game/GameControlBar.tsx\napps/mobile/tests/components/GameControlBar.test.tsx\n",
		);
		expect(run(null, { exec, projectDir: "/p" })).toBeNull();
	});

	it("ignore les fichiers hors screens/components (ex. src/lib)", () => {
		const exec = makeExec("apps/mobile/src/lib/mobileAccount.ts\n");
		expect(run(null, { exec, projectDir: "/p" })).toBeNull();
	});

	it("détecte un test ajouté en untracked (pas encore stagé)", () => {
		const exec = makeExec(
			"apps/mobile/src/screens/ProfileScreen.tsx\n",
			"apps/mobile/tests/screens/ProfileScreen.test.tsx\n",
		);
		expect(run(null, { exec, projectDir: "/p" })).toBeNull();
	});

	it("fonctionne aussi hors monorepo (pas de préfixe apps/*)", () => {
		const exec = makeExec("src/screens/Home.tsx\n");
		const r = run(null, { exec, projectDir: "/p" });
		expect(r?.exitCode).toBe(2);
		expect(r?.message).toContain("tests/screens/Home.test.tsx");
	});

	it("liste tous les fichiers manquants dans un même message", () => {
		const exec = makeExec(
			"apps/mobile/src/screens/A.tsx\napps/mobile/src/components/B.tsx\n",
		);
		const r = run(null, { exec, projectDir: "/p" });
		expect(r?.message).toContain("A.tsx");
		expect(r?.message).toContain("B.tsx");
	});
});
