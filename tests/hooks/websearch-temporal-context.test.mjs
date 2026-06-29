// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/websearch-temporal-context.mjs";

const input = (query) => ({ tool_input: { query } });

describe("websearch-temporal-context", () => {
	it("ajoute l'année si aucun contexte temporel", () => {
		const result = run(input("best React state management"), {
			currentYear: 2026,
		});
		expect(result?.hookSpecificOutput?.modifiedToolInput?.query).toBe(
			"best React state management 2026",
		);
	});

	it("ne modifie pas si une année est déjà présente", () => {
		expect(
			run(input("Next.js 15 features 2025"), { currentYear: 2026 }),
		).toBeNull();
	});

	it('ne modifie pas si "latest" est présent', () => {
		expect(
			run(input("latest Claude models"), { currentYear: 2026 }),
		).toBeNull();
	});

	it('ne modifie pas si "recent" est présent', () => {
		expect(
			run(input("recent AI breakthroughs"), { currentYear: 2026 }),
		).toBeNull();
	});

	it('ne modifie pas si "current" est présent', () => {
		expect(run(input("current Node.js LTS"), { currentYear: 2026 })).toBeNull();
	});

	it("retourne null si query vide", () => {
		expect(run(input(""), { currentYear: 2026 })).toBeNull();
	});

	it("retourne null si tool_input absent", () => {
		expect(run({}, { currentYear: 2026 })).toBeNull();
	});

	it("retourne le bon hookEventName", () => {
		const result = run(input("TypeScript tips"), { currentYear: 2026 });
		expect(result?.hookSpecificOutput?.hookEventName).toBe("PreToolUse");
	});
});
