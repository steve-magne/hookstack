// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/enforce-package-managers.mjs";

describe("enforce-package-managers", () => {
	it("laisse passer un outil non-Bash", () => {
		expect(
			run({ tool_name: "Write", tool_input: { file_path: "x.ts" } }),
		).toBeNull();
	});

	it("laisse passer pnpm install", () => {
		expect(
			run({ tool_name: "Bash", tool_input: { command: "pnpm install" } }),
		).toBeNull();
	});

	it("laisse passer une commande sans gestionnaire de paquets", () => {
		expect(
			run({ tool_name: "Bash", tool_input: { command: "echo hello" } }),
		).toBeNull();
	});

	it("laisse passer si tool_input est absent", () => {
		expect(run({ tool_name: "Bash" })).toBeNull();
	});

	it("bloque npm install", () => {
		const r = run({
			tool_name: "Bash",
			tool_input: { command: "npm install" },
		});
		expect(r?.decision).toBe("block");
		expect(r?.reason).toContain("pnpm");
	});

	it("bloque npm seul", () => {
		const r = run({ tool_name: "Bash", tool_input: { command: "npm" } });
		expect(r?.decision).toBe("block");
	});

	it("bloque npm enchaîné après &&", () => {
		const r = run({
			tool_name: "Bash",
			tool_input: { command: "cd app && npm install" },
		});
		expect(r?.decision).toBe("block");
	});

	it("bloque yarn add", () => {
		const r = run({
			tool_name: "Bash",
			tool_input: { command: "yarn add lodash" },
		});
		expect(r?.decision).toBe("block");
		expect(r?.reason).toContain("pnpm");
	});

	it("bloque yarn seul", () => {
		const r = run({ tool_name: "Bash", tool_input: { command: "yarn" } });
		expect(r?.decision).toBe("block");
	});

	it('ne bloque pas une commande contenant "npm" dans un nom de fichier', () => {
		expect(
			run({ tool_name: "Bash", tool_input: { command: "cat package.json" } }),
		).toBeNull();
	});

	it('laisse passer npm dans un message de commit git (-m "...")', () => {
		expect(
			run({
				tool_name: "Bash",
				tool_input: { command: 'git commit -m "support npm and yarn"' },
			}),
		).toBeNull();
	});

	it('laisse passer yarn dans le body d\'une PR gh ("...")', () => {
		expect(
			run({
				tool_name: "Bash",
				tool_input: { command: 'gh pr create --body "yarn is now supported"' },
			}),
		).toBeNull();
	});

	it("laisse passer npm dans un argument entre guillemets simples", () => {
		expect(
			run({
				tool_name: "Bash",
				tool_input: { command: "echo 'use npm here'" },
			}),
		).toBeNull();
	});

	it("bloque npm après && même si la commande débute par git", () => {
		const r = run({
			tool_name: "Bash",
			tool_input: { command: "git status && npm install" },
		});
		expect(r?.decision).toBe("block");
	});

	it("bloque yarn après && même si la commande débute par gh", () => {
		const r = run({
			tool_name: "Bash",
			tool_input: { command: "gh auth status && yarn add lodash" },
		});
		expect(r?.decision).toBe("block");
	});
});
