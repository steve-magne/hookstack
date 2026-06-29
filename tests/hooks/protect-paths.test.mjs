// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/protect-paths.mjs";

describe("protect-paths", () => {
	it("bloque .env", () => {
		expect(run({ tool_input: { file_path: "/proj/.env" } })?.decision).toBe(
			"block",
		);
	});

	it("bloque un fichier dans secrets/", () => {
		expect(
			run({ tool_input: { file_path: "/proj/secrets/key.txt" } })?.decision,
		).toBe("block");
	});

	it("bloque une clé .pem", () => {
		expect(
			run({ tool_input: { file_path: "/proj/server.pem" } })?.decision,
		).toBe("block");
	});

	it("laisse passer un fichier source ordinaire", () => {
		expect(run({ tool_input: { file_path: "/proj/src/index.ts" } })).toBeNull();
	});

	it("laisse passer si file_path absent", () => {
		expect(run({})).toBeNull();
	});
});
