// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/user-prompt-name-agent.mjs";

function baseDeps(overrides = {}) {
	return {
		exists: () => false,
		readFile: () => "{}",
		writeFile: vi.fn(),
		mkdir: vi.fn(),
		home: "/home",
		pickName: () => "Nexus",
		...overrides,
	};
}

describe("user-prompt-name-agent", () => {
	it("attribue un nom à une nouvelle session", () => {
		const writeFile = vi.fn();
		const out = run({ session_id: "s1" }, baseDeps({ writeFile }));
		expect(out).toContain("Nexus");
		expect(writeFile).toHaveBeenCalled();
	});

	it("ne réattribue pas si un nom existe déjà", () => {
		const deps = baseDeps({
			exists: () => true,
			readFile: () => JSON.stringify({ session_id: "s1", agent_name: "Atlas" }),
		});
		expect(run({ session_id: "s1" }, deps)).toBeNull();
	});

	it("crée le dossier de sessions", () => {
		const mkdir = vi.fn();
		run({ session_id: "s1" }, baseDeps({ mkdir }));
		expect(mkdir).toHaveBeenCalledWith(expect.stringContaining("sessions"), {
			recursive: true,
		});
	});
});
