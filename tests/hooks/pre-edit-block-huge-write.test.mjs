// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/block-huge-write.mjs";

const write = (content, file_path = "/proj/data.json") => ({
	tool_name: "Write",
	tool_input: { file_path, content },
});

describe("block-huge-write", () => {
	it("bloque un contenu au-dessus du seuil", () => {
		const r = run(write("x".repeat(600_000)));
		expect(r?.decision).toBe("block");
		expect(r?.reason).toContain("Ko");
	});

	it("laisse passer un contenu sous le seuil", () => {
		expect(run(write("x".repeat(1000)))).toBeNull();
	});

	it("respecte un seuil injecté", () => {
		expect(run(write("x".repeat(200)), { maxBytes: 100 })?.decision).toBe(
			"block",
		);
	});

	it("ignore Edit (patch ciblé, pas de contenu complet)", () => {
		expect(
			run({ tool_name: "Edit", tool_input: { content: "x".repeat(600_000) } }),
		).toBeNull();
	});

	it("laisse passer si content absent", () => {
		expect(
			run({ tool_name: "Write", tool_input: { file_path: "/a" } }),
		).toBeNull();
	});
});
