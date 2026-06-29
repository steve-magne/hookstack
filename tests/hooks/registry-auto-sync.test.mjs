// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/registry-auto-sync.mjs";

const deps = (exec) => ({ exec, projectDir: "/proj" });

describe("registry-auto-sync", () => {
	it("resync sur édition d'un hook .mjs", () => {
		const exec = vi.fn(() => "ligne1\nligne2\nligne3");
		const r = run(
			{ tool_input: { file_path: "/proj/.claude/hooks/foo.mjs" } },
			deps(exec),
		);
		expect(exec).toHaveBeenCalledWith("/proj");
		expect(r?.message).toContain("registry-auto-sync");
	});

	it("resync sur édition du registre", () => {
		const exec = vi.fn(() => "ok");
		run(
			{ tool_input: { file_path: "/proj/registry/registry.json" } },
			deps(exec),
		);
		expect(exec).toHaveBeenCalled();
	});

	it("ignore les autres fichiers", () => {
		const exec = vi.fn();
		expect(
			run({ tool_input: { file_path: "/proj/src/x.ts" } }, deps(exec)),
		).toBeNull();
		expect(exec).not.toHaveBeenCalled();
	});

	it("ne se resync pas lui-même", () => {
		const exec = vi.fn();
		expect(
			run(
				{
					tool_input: {
						file_path: "/proj/.claude/hooks/registry-auto-sync.mjs",
					},
				},
				deps(exec),
			),
		).toBeNull();
		expect(exec).not.toHaveBeenCalled();
	});

	it("ne fait rien sans projectDir", () => {
		const exec = vi.fn();
		expect(
			run(
				{ tool_input: { file_path: "/proj/registry/registry.json" } },
				{ exec, projectDir: null },
			),
		).toBeNull();
		expect(exec).not.toHaveBeenCalled();
	});

	it("capture une erreur de sync", () => {
		const exec = () => {
			throw new Error("boom");
		};
		const r = run(
			{ tool_input: { file_path: "/proj/.claude/hooks/foo.mjs" } },
			deps(exec),
		);
		expect(r?.message).toContain("échec");
	});

	it("résout le projectDir depuis le chemin du fichier (worktree)", () => {
		const exec = vi.fn(() => "ok");
		run({ file_path: "/tmp/some-worktree/.claude/hooks/foo.mjs" }, deps(exec));
		expect(exec).toHaveBeenCalledWith("/tmp/some-worktree");
	});

	it("FileChanged: file_path a priorité sur tool_input pour résoudre le répertoire", () => {
		const exec = vi.fn(() => "ok");
		run(
			{
				file_path: "/wt/.claude/hooks/bar.mjs",
				tool_input: { file_path: "/proj/.claude/hooks/bar.mjs" },
			},
			deps(exec),
		);
		expect(exec).toHaveBeenCalledWith("/wt");
	});
});
