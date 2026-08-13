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
				exists: (p) =>
					p.endsWith("/pnpm-lock.yaml") || p.endsWith("/package.json"),
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
			{
				exec,
				exists: (p) => p.endsWith("/package.json"),
				projectDir: "/repo",
			},
		);
		expect(exec).toHaveBeenCalledWith(
			expect.stringContaining("npm test --if-present"),
		);
	});
	it("ne lance rien sans package.json ni projet Python", () => {
		const exec = vi.fn();
		run({ task_subject: "x" }, { exec, exists: () => false, projectDir: "/repo" });
		expect(exec).not.toHaveBeenCalled();
	});
	it("projet Python avec tests → gate pytest via uv", () => {
		const exec = vi.fn();
		run(
			{ task_subject: "x" },
			{
				exec,
				exists: (p) => p.endsWith("/pyproject.toml") || p.endsWith("/tests"),
				projectDir: "/repo",
			},
		);
		expect(exec).toHaveBeenCalledWith("uv run pytest -q");
	});
	it("projet Python avec pytest.ini → gate pytest même sans dossier tests/", () => {
		const exec = vi.fn();
		run(
			{ task_subject: "x" },
			{
				exec,
				exists: (p) => p.endsWith("/pyproject.toml") || p.endsWith("/pytest.ini"),
				projectDir: "/repo",
			},
		);
		expect(exec).toHaveBeenCalledWith("uv run pytest -q");
	});
	it("projet Python sans tests déclarés → pas de gate (évite exit 5)", () => {
		const exec = vi.fn();
		run(
			{ task_subject: "x" },
			{
				exec,
				exists: (p) => p.endsWith("/pyproject.toml"),
				projectDir: "/repo",
			},
		);
		expect(exec).not.toHaveBeenCalled();
	});
	it("projet mixte → pytest ET test npm", () => {
		const exec = vi.fn();
		run(
			{ task_subject: "x" },
			{
				exec,
				exists: (p) =>
					p.endsWith("/pyproject.toml") ||
					p.endsWith("/tests") ||
					p.endsWith("/package.json"),
				projectDir: "/repo",
			},
		);
		expect(exec).toHaveBeenCalledWith("uv run pytest -q");
		expect(exec).toHaveBeenCalledWith(
			expect.stringContaining("test --if-present"),
		);
	});
	it("un échec pytest bloque la complétion", () => {
		const exec = () => {
			const e = new Error("fail");
			e.stdout = Buffer.from("2 failed, 3 passed");
			throw e;
		};
		const r = run(
			{ task_subject: "Feature X" },
			{
				exec,
				exists: (p) => p.endsWith("/pyproject.toml") || p.endsWith("/tests"),
				projectDir: "/repo",
			},
		);
		expect(r.exitCode).toBe(2);
		expect(r.message).toContain("Feature X");
		expect(r.message).toContain("2 failed");
	});
});
