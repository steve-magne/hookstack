// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/seo-heading-hierarchy-guard.mjs";

const input = (file_path) => ({ tool_input: { file_path } });
const FILE = "/p/src/app/page.tsx";

describe("seo-heading-hierarchy-guard", () => {
	it("ignore les fichiers hors src/", () => {
		expect(
			run(input("/p/docs/x.tsx"), { readFile: () => "<h1/><h1/>" }),
		).toBeNull();
	});

	it("ignore un fichier illisible", () => {
		expect(
			run(input(FILE), {
				readFile: () => {
					throw new Error("ENOENT");
				},
			}),
		).toBeNull();
	});

	it("silencieux avec un seul <h1>", () => {
		expect(
			run(input(FILE), {
				readFile: () => "<h1>Title</h1><h2>Sub</h2><h2>Sub</h2>",
			}),
		).toBeNull();
	});

	it("silencieux sans aucun <h1>", () => {
		expect(
			run(input(FILE), { readFile: () => "<h2>A</h2><h3>B</h3>" }),
		).toBeNull();
	});

	it("signale plusieurs <h1>", () => {
		const r = run(input(FILE), { readFile: () => "<h1>A</h1>\n<h1>B</h1>" });
		expect(r?.message).toContain("2 <h1>");
	});

	it("ne confond pas un composant <H1>", () => {
		expect(run(input(FILE), { readFile: () => "<H1/><H1/>" })).toBeNull();
	});
});
