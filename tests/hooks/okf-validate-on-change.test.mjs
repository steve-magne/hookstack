// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/okf-validate-on-change.mjs";

const OK = JSON.stringify({ passed: true, errors: [], warnings: [] });
const BAD = JSON.stringify({
	passed: false,
	errors: ["vision/mission.md: missing type"],
	warnings: [],
});

describe("okf-validate-on-change", () => {
	it("no-op si le fichier n'est pas sous okf/", () => {
		const exec = vi.fn();
		expect(run({ file_path: "src/app/page.tsx" }, { exec, projectDir: "/p" })).toBeNull();
		expect(exec).not.toHaveBeenCalled();
	});

	it("no-op si projectDir absent", () => {
		const exec = vi.fn();
		expect(run({ file_path: "okf/vision/mission.md" }, { exec })).toBeNull();
	});

	it("no-op si le bundle est conforme (passed)", () => {
		const exec = vi.fn(() => OK);
		expect(
			run({ file_path: "okf/architecture/overview.md" }, { exec, projectDir: "/p" }),
		).toBeNull();
	});

	it("retourne un contexte d'erreur si la validation strict échoue", () => {
		const exec = vi.fn(() => {
			const e = new Error("exit 1");
			e.stdout = BAD;
			throw e;
		});
		const r = run({ file_path: "okf/vision/mission.md" }, { exec, projectDir: "/p" });
		expect(r?.hookSpecificOutput?.hookEventName).toBe("FileChanged");
		expect(r?.hookSpecificOutput?.additionalContext).toContain("missing type");
	});

	it("no-op si la sortie n'est pas du JSON (problème d'outillage)", () => {
		const exec = vi.fn(() => {
			const e = new Error("exit 1");
			e.stdout = "node: command not found";
			throw e;
		});
		expect(
			run({ file_path: "okf/vision/mission.md" }, { exec, projectDir: "/p" }),
		).toBeNull();
	});
});
