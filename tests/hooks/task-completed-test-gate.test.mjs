// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/task-completed-test-gate.mjs";

describe("task-completed-test-gate", () => {
	it("passe si les tests réussissent", () => {
		expect(run({ task_subject: "x" }, { exec: vi.fn() })).toBeNull();
	});
	it("bloque si les tests échouent", () => {
		const exec = () => {
			const e = new Error("fail");
			e.stdout = Buffer.from("1 failed");
			throw e;
		};
		const r = run({ task_subject: "Ma tâche" }, { exec });
		expect(r.exitCode).toBe(2);
		expect(r.message).toContain("Ma tâche");
	});
	it("utilise le gestionnaire de paquets détecté depuis le lockfile (pnpm)", () => {
		const exec = vi.fn();
		run(
			{ task_subject: "x" },
			{
				exec,
				exists: (p) => p.endsWith("/pnpm-lock.yaml"),
				projectDir: "/repo",
			},
		);
		expect(exec).toHaveBeenCalledWith(
			expect.stringContaining("pnpm test --if-present"),
		);
	});
	it("replie sur npm si aucun lockfile reconnu", () => {
		const exec = vi.fn();
		run(
			{ task_subject: "x" },
			{ exec, exists: () => false, projectDir: "/repo" },
		);
		expect(exec).toHaveBeenCalledWith(
			expect.stringContaining("npm test --if-present"),
		);
	});
});
