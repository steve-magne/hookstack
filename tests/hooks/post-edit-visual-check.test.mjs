// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/post-edit-visual-check.mjs";

const inp = (file_path) => ({ tool_input: { file_path } });
const ctx = (file_path) =>
	run(inp(file_path))?.hookSpecificOutput?.additionalContext;

describe("post-edit-visual-check", () => {
	it("laisse passer si tool_input absent", () => {
		expect(run({ tool_name: "Write" })).toBeNull();
	});

	it("ignore un fichier non front-end (.ts logique)", () => {
		expect(run(inp("/p/src/lib/utils.ts"))).toBeNull();
	});

	it("ignore un fichier serveur (.mjs)", () => {
		expect(run(inp("/p/.claude/hooks/foo.mjs"))).toBeNull();
	});

	it("ignore un fichier sans extension", () => {
		expect(run(inp("/p/Makefile"))).toBeNull();
	});

	it("déclenche sur un composant .tsx", () => {
		expect(ctx("/p/src/components/Card.tsx")).toContain("component");
	});

	it("déclenche sur un composant .jsx", () => {
		expect(ctx("/p/src/components/Btn.jsx")).toMatch(/component/);
	});

	it("déclenche sur une feuille de style .css", () => {
		expect(ctx("/p/src/app/globals.css")).toContain("styles");
	});

	it("déclenche sur du .scss", () => {
		expect(ctx("/p/styles/main.scss")).toContain("styles");
	});

	it("déclenche sur du .html", () => {
		expect(ctx("/p/public/index.html")).toContain("markup");
	});

	it("déclenche sur un composant .vue", () => {
		expect(ctx("/p/src/App.vue")).toContain("markup");
	});

	it("déclenche sur du .svelte", () => {
		expect(ctx("/p/src/App.svelte")).toBeTruthy();
	});

	it("mentionne le nom du fichier et invite à constater le rendu", () => {
		const c = ctx("/p/src/components/Hero.tsx");
		expect(c).toContain("Hero.tsx");
		expect(c).toContain("preview");
		expect(c).toContain("look at it");
	});

	it("cible le bon événement", () => {
		expect(run(inp("/p/x.css"))?.hookSpecificOutput?.hookEventName).toBe(
			"PostToolUse",
		);
	});
});
