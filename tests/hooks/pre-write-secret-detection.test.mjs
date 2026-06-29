// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/pre-write-secret-detection.mjs";
import { SECRETS } from "./_utils.mjs";

describe("pre-write-secret-detection", () => {
	it("laisse passer si tool_input absent", () => {
		expect(run({ tool_name: "Write" })).toBeNull();
	});

	it("laisse passer un contenu sain (Write)", () => {
		expect(
			run({
				tool_name: "Write",
				tool_input: { file_path: "src/a.ts", content: "const x = 1;" },
			}),
		).toBeNull();
	});

	it("laisse passer un new_string sain (Edit)", () => {
		expect(
			run({
				tool_name: "Edit",
				tool_input: { file_path: "src/a.ts", new_string: "return null;" },
			}),
		).toBeNull();
	});

	it("bloque une clé API style Anthropic dans content", () => {
		const r = run({
			tool_name: "Write",
			tool_input: {
				file_path: "config.ts",
				content: `const k = "${SECRETS.anthropicKey}";`,
			},
		});
		expect(r?.decision).toBe("block");
		expect(r?.reason).toContain("environment variable");
	});

	it("bloque un token GitHub dans new_string", () => {
		const r = run({
			tool_name: "Edit",
			tool_input: {
				file_path: "ci.yml",
				new_string: `token: ${SECRETS.githubToken}`,
			},
		});
		expect(r?.decision).toBe("block");
	});

	it("bloque une affectation de mot de passe", () => {
		expect(
			run({
				tool_name: "Write",
				tool_input: { file_path: "db.py", content: SECRETS.passwordLine },
			})?.decision,
		).toBe("block");
	});

	it("bloque une clé privée PEM", () => {
		expect(
			run({
				tool_name: "Write",
				tool_input: { file_path: "key.pem", content: SECRETS.privateKey },
			})?.decision,
		).toBe("block");
	});

	it("ne bloque pas un placeholder court", () => {
		expect(
			run({
				tool_name: "Write",
				tool_input: { file_path: ".env.example", content: "API_KEY=xxx" },
			}),
		).toBeNull();
	});
});
