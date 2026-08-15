// @vitest-environment node
import { describe, expect, it } from "vitest";
import { changedFiles, parsePorcelain } from "../../.claude/hooks/lib/changed-files.mjs";

const CWD = "/repo";

/** Fake exec git : porcelain / merge-base / rev-parse / diff pilotables. */
function makeExec({
	porcelain = "",
	base = "",
	head = "",
	committed = "",
	noGit = false,
	noBase = false,
} = {}) {
	return (cmd) => {
		if (cmd.startsWith("git status")) {
			if (noGit) throw new Error("not a git repository");
			return porcelain;
		}
		if (cmd.startsWith("git merge-base")) {
			if (noBase) throw new Error("fatal: origin/main not found");
			return base;
		}
		if (cmd.startsWith("git rev-parse")) return head;
		if (cmd.startsWith("git diff --name-only")) return committed;
		return "";
	};
}

describe("parsePorcelain", () => {
	it("extrait les chemins du format porcelain", () => {
		expect(parsePorcelain(" M foo.ts\n?? bar.ts\n M src/a.py")).toEqual([
			"foo.ts",
			"bar.ts",
			"src/a.py",
		]);
	});

	it("résout les renames vers la cible", () => {
		expect(parsePorcelain("R  old.py -> new.py")).toEqual(["new.py"]);
	});

	it("ignore la sortie vide", () => {
		expect(parsePorcelain("")).toEqual([]);
		expect(parsePorcelain(null)).toEqual([]);
	});
});

describe("changedFiles", () => {
	it("retourne [] sur un arbre propre sans commit local (base === HEAD)", () => {
		expect(
			changedFiles({ exec: makeExec({ base: "abc", head: "abc" }), cwd: CWD }),
		).toEqual([]);
	});

	it("retourne les modifications de l'arbre de travail", () => {
		const result = changedFiles({
			exec: makeExec({ porcelain: " M src/foo.ts", base: "abc", head: "abc" }),
			cwd: CWD,
		});
		expect(result).toEqual(["src/foo.ts"]);
	});

	it("BUG FIXÉ : worktree propre mais commits non poussés → fichiers du diff merge-base", () => {
		// Scénario exact du bug : l'agent a committé + poussé, l'arbre est propre,
		// mais la branche a des commits que origin/main ne connaît pas encore.
		const result = changedFiles({
			exec: makeExec({
				porcelain: "",
				base: "abc123",
				head: "def456",
				committed: "src/foo.py\ntests/campaigns/test_pipeline.py",
			}),
			cwd: CWD,
		});
		expect(result).toEqual(["src/foo.py", "tests/campaigns/test_pipeline.py"]);
	});

	it("combine arbre de travail et commits locaux, dédupliqué et trié", () => {
		const result = changedFiles({
			exec: makeExec({
				porcelain: " M src/a.ts\n M src/b.ts",
				base: "abc",
				head: "def",
				committed: "src/a.ts\nsrc/c.ts",
			}),
			cwd: CWD,
		});
		expect(result).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"]);
	});

	it("retourne null hors dépôt git (comportement historique des hooks)", () => {
		expect(
			changedFiles({ exec: makeExec({ noGit: true }), cwd: CWD }),
		).toBeNull();
	});

	it("retourne null si l'exec renvoie null (DI)", () => {
		expect(changedFiles({ exec: () => null, cwd: CWD })).toBeNull();
	});

	it("retombe sur l'arbre de travail seul sans origin/main (merge-base échoue)", () => {
		const result = changedFiles({
			exec: makeExec({ porcelain: " M src/foo.ts", noBase: true }),
			cwd: CWD,
		});
		expect(result).toEqual(["src/foo.ts"]);
	});

	it("ignore un diff vide quand base === HEAD", () => {
		const result = changedFiles({
			exec: makeExec({ base: "abc", head: "abc", committed: "should-not-matter" }),
			cwd: CWD,
		});
		expect(result).toEqual([]);
	});
});
