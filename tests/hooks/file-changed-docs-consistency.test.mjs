// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	findSiblingReadmes,
	run,
} from "../../.claude/hooks/file-changed-docs-consistency.mjs";

const PROJECT = "/p";

function deps({ readmes = ["README.md", "packages/cli/README.md"] } = {}) {
	return {
		projectDir: PROJECT,
		exists: (p) =>
			p === `${PROJECT}/packages` ||
			readmes.some((r) => p === `${PROJECT}/${r}`),
		readdir: (p) => (p === `${PROJECT}/packages` ? ["cli"] : []),
	};
}

describe("file-changed-docs-consistency", () => {
	it("ignore un fichier qui n'est pas un README", () => {
		expect(run({ file_path: "/p/src/a.ts" }, deps())).toBeNull();
	});

	it("ignore un unlink", () => {
		expect(
			run({ file_path: "/p/README.md", event: "unlink" }, deps()),
		).toBeNull();
	});

	it("liste les surfaces sœurs quand le README racine change", () => {
		const r = run({ file_path: "/p/README.md" }, deps());
		expect(r?.hookSpecificOutput?.additionalContext).toContain(
			"packages/cli/README.md",
		);
		expect(r?.hookSpecificOutput?.additionalContext).not.toContain(
			"README.md changed. These sibling docs share the same product promise and must stay consistent (CLI examples, slugs, wording): README.md",
		);
	});

	it("exclut le README modifié de la liste des sœurs", () => {
		const r = run({ file_path: "/p/packages/cli/README.md" }, deps());
		const ctx = r?.hookSpecificOutput?.additionalContext ?? "";
		expect(ctx).toContain("packages/cli/README.md changed");
		expect(ctx).toMatch(/: README\.md\./);
	});

	it("retourne null sans surface sœur", () => {
		expect(
			run({ file_path: "/p/README.md" }, deps({ readmes: ["README.md"] })),
		).toBeNull();
	});
});

describe("findSiblingReadmes", () => {
	it("trouve racine + packages/*", () => {
		expect(findSiblingReadmes(deps())).toEqual([
			"README.md",
			"packages/cli/README.md",
		]);
	});
	it("fonctionne sans dossier packages", () => {
		const d = {
			projectDir: PROJECT,
			exists: (p) => p === `${PROJECT}/README.md`,
			readdir: () => [],
		};
		expect(findSiblingReadmes(d)).toEqual(["README.md"]);
	});
});
