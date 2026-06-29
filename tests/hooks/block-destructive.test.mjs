// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/block-destructive.mjs";

describe("block-destructive", () => {
	it("laisse passer une commande anodine", () => {
		expect(run({ tool_input: { command: "ls -la" } })).toBeNull();
	});

	it("bloque rm -rf /", () => {
		const r = run({ tool_input: { command: "rm -rf /" } });
		expect(r?.decision).toBe("block");
		expect(r?.reason).toContain("rm -rf /");
	});

	it("bloque force-push sur main", () => {
		const r = run({ tool_input: { command: "git push --force origin main" } });
		expect(r?.decision).toBe("block");
	});

	it("bloque DROP TABLE", () => {
		expect(run({ tool_input: { command: "DROP TABLE users" } })?.decision).toBe(
			"block",
		);
	});

	it("bloque chmod 777 récursif sur /", () => {
		expect(run({ tool_input: { command: "chmod -R 777 /" } })?.decision).toBe(
			"block",
		);
	});

	it("laisse passer si tool_input absent", () => {
		expect(run({})).toBeNull();
	});

	// git reset --hard — nuancé selon la cible et l'état de l'arbre
	it("bloque git reset --hard vers une autre cible que HEAD, même arbre propre", () => {
		const r = run(
			{ tool_input: { command: "git reset --hard HEAD~1" } },
			{ gitStatus: () => "" },
		);
		expect(r?.decision).toBe("block");
		expect(r?.reason).toContain("HEAD~1");
	});

	it("bloque git reset --hard HEAD si arbre sale", () => {
		const r = run(
			{ tool_input: { command: "git reset --hard HEAD" } },
			{ gitStatus: () => " M src/a.ts\n" },
		);
		expect(r?.decision).toBe("block");
		expect(r?.reason).toContain("non commitées");
	});

	it("laisse passer git reset --hard HEAD si arbre propre", () => {
		expect(
			run(
				{ tool_input: { command: "git reset --hard HEAD" } },
				{ gitStatus: () => "" },
			),
		).toBeNull();
	});

	it("laisse passer git reset --hard sans cible si arbre propre", () => {
		expect(
			run(
				{ tool_input: { command: "git reset --hard" } },
				{ gitStatus: () => "\n" },
			),
		).toBeNull();
	});

	it("bloque git reset --hard si git status échoue (hors repo)", () => {
		expect(
			run(
				{ tool_input: { command: "git reset --hard" } },
				{ gitStatus: () => "unknown" },
			)?.decision,
		).toBe("block");
	});

	it("bloque TRUNCATE TABLE", () => {
		expect(
			run({ tool_input: { command: "TRUNCATE TABLE users" } })?.decision,
		).toBe("block");
	});

	it("bloque mkfs", () => {
		expect(
			run({ tool_input: { command: "mkfs.ext4 /dev/sdb1" } })?.decision,
		).toBe("block");
	});

	it("bloque dd if=", () => {
		expect(
			run({ tool_input: { command: "dd if=/dev/zero of=/dev/sda" } })?.decision,
		).toBe("block");
	});

	// Faux positifs — mentions documentaires dans des arguments quotés
	it("laisse passer git commit -m avec mention documentaire", () => {
		expect(
			run({
				tool_input: { command: 'git commit -m "docs: rm -rf * est dangereux"' },
			}),
		).toBeNull();
	});

	it("laisse passer gh pr create --body mentionnant git reset", () => {
		expect(
			run(
				{
					tool_input: {
						command: 'gh pr create --body "extension: git reset --hard bloqué"',
					},
				},
				{ gitStatus: () => " M a" },
			),
		).toBeNull();
	});

	it("laisse passer echo avec pattern dans une string", () => {
		expect(
			run({ tool_input: { command: "echo 'TRUNCATE TABLE est interdit'" } }),
		).toBeNull();
	});
});
