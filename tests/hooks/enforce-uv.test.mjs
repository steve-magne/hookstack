// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/enforce-uv.mjs";

const bash = (command) => ({ tool_name: "Bash", tool_input: { command } });

describe("enforce-uv", () => {
	it("ignore les outils non-Bash", () => {
		expect(
			run({ tool_name: "Write", tool_input: { command: "pip install foo" } }),
		).toBeNull();
	});

	it("bloque pip install", () => {
		const r = run(bash("pip install requests"));
		expect(r?.decision).toBe("block");
		expect(r?.reason).toContain("uv add");
	});

	it("bloque pip3 install", () => {
		const r = run(bash("pip3 install numpy"));
		expect(r?.decision).toBe("block");
		expect(r?.reason).toContain("uv add");
	});

	it("bloque poetry add", () => {
		const r = run(bash("poetry add fastapi"));
		expect(r?.decision).toBe("block");
		expect(r?.reason).toContain("uv add");
	});

	it("bloque poetry install", () => {
		const r = run(bash("poetry install"));
		expect(r?.decision).toBe("block");
		expect(r?.reason).toContain("uv sync");
	});

	it("laisse passer uv add", () => {
		expect(run(bash("uv add requests"))).toBeNull();
	});

	it("laisse passer pip show (pas install)", () => {
		expect(run(bash("pip show requests"))).toBeNull();
	});

	it("bloque pip install dans une chaîne de commandes", () => {
		const r = run(bash("cd myproject && pip install -r requirements.txt"));
		expect(r?.decision).toBe("block");
	});
});
