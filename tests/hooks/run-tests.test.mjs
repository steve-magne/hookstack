// @vitest-environment node
import { describe, expect, it } from "vitest";
import { detect, run } from "../../.claude/hooks/run-tests.mjs";

const PROJECT_DIR = "/fake/project";

const MAIN_ROOT = "/fake/main";

function makeOpts({
	scripts = { test: "vitest" },
	hasPkg = true,
	hasPnpmLock = false,
	hasYarnLock = false,
	hasBunLockb = false,
	hasBunLock = false,
	hasPyproject = false,
	hasGoMod = false,
	hasNodeModules = true,
	spawnStatus = 0,
} = {}) {
	return {
		projectDir: PROJECT_DIR,
		mainRoot: MAIN_ROOT,
		changed: ["src/foo.ts"],
		exists: (p) => {
			if (p.endsWith("node_modules")) return hasNodeModules;
			if (p.endsWith("package.json")) return hasPkg;
			if (p.endsWith("pnpm-lock.yaml")) return hasPnpmLock;
			if (p.endsWith("yarn.lock")) return hasYarnLock;
			if (p.endsWith("bun.lockb")) return hasBunLockb;
			if (p.endsWith("bun.lock")) return hasBunLock;
			if (p.endsWith("pyproject.toml")) return hasPyproject;
			if (p.endsWith("go.mod")) return hasGoMod;
			return false;
		},
		readFile: () => JSON.stringify({ scripts }),
		spawn: () => ({
			status: spawnStatus,
			stdout: "Test output",
			stderr: spawnStatus !== 0 ? "Error details" : "",
		}),
	};
}

describe("detect", () => {
	it("retourne pnpm si pnpm-lock.yaml existe", () => {
		const opts = makeOpts({ hasPnpmLock: true });
		const result = detect({
			exists: opts.exists,
			readFile: opts.readFile,
			projectDir: PROJECT_DIR,
		});
		expect(result).toEqual(["pnpm", ["test", "--", "--run"]]);
	});

	it("retourne npm si aucun lockfile spécifique", () => {
		const opts = makeOpts();
		const result = detect({
			exists: opts.exists,
			readFile: opts.readFile,
			projectDir: PROJECT_DIR,
		});
		expect(result).toEqual(["npm", ["test", "--", "--run"]]);
	});

	it("retourne yarn si yarn.lock existe", () => {
		const opts = makeOpts({ hasYarnLock: true });
		const result = detect({
			exists: opts.exists,
			readFile: opts.readFile,
			projectDir: PROJECT_DIR,
		});
		expect(result).toEqual(["yarn", ["test", "--", "--run"]]);
	});

	it("retourne bun si bun.lockb existe (bun <1.2)", () => {
		const opts = makeOpts({ hasBunLockb: true });
		const result = detect({
			exists: opts.exists,
			readFile: opts.readFile,
			projectDir: PROJECT_DIR,
		});
		expect(result).toEqual(["bun", ["test"]]);
	});

	it("retourne bun si bun.lock existe (bun ≥1.2)", () => {
		const opts = makeOpts({ hasBunLock: true });
		const result = detect({
			exists: opts.exists,
			readFile: opts.readFile,
			projectDir: PROJECT_DIR,
		});
		expect(result).toEqual(["bun", ["test"]]);
	});

	it("pnpm est prioritaire sur yarn si les deux lockfiles existent", () => {
		const opts = makeOpts({ hasPnpmLock: true, hasYarnLock: true });
		const result = detect({
			exists: opts.exists,
			readFile: opts.readFile,
			projectDir: PROJECT_DIR,
		});
		expect(result).toEqual(["pnpm", ["test", "--", "--run"]]);
	});

	it("retourne null si pas de package.json ni pytest ni go.mod", () => {
		const result = detect({
			exists: () => false,
			readFile: () => "{}",
			projectDir: PROJECT_DIR,
		});
		expect(result).toBeNull();
	});

	it("ne prend plus en charge pytest — délégué à stop-pytest (dédup)", () => {
		const result = detect({
			exists: (p) => p.endsWith("pyproject.toml"),
			readFile: () => "{}",
			projectDir: PROJECT_DIR,
		});
		expect(result).toBeNull();
	});

	it("retourne go test si go.mod existe", () => {
		const result = detect({
			exists: (p) => p.endsWith("go.mod"),
			readFile: () => "{}",
			projectDir: PROJECT_DIR,
		});
		expect(result).toEqual(["go", ["test", "./..."]]);
	});

	it("scoped + vitest → --changed (tests liés seulement)", () => {
		const opts = makeOpts({ scripts: { test: "vitest" } });
		const result = detect({
			exists: opts.exists,
			readFile: opts.readFile,
			projectDir: PROJECT_DIR,
			scoped: true,
		});
		expect(result).toEqual(["npm", ["test", "--", "--run", "--changed"]]);
	});

	it("scoped + jest → --onlyChanged", () => {
		const opts = makeOpts({ scripts: { test: "jest" } });
		const result = detect({
			exists: opts.exists,
			readFile: opts.readFile,
			projectDir: PROJECT_DIR,
			scoped: true,
		});
		expect(result).toEqual(["npm", ["test", "--", "--onlyChanged"]]);
	});

	it("scoped + runner inconnu → suite complète (pas de flag affecté)", () => {
		const opts = makeOpts({ scripts: { test: "mocha" } });
		const result = detect({
			exists: opts.exists,
			readFile: opts.readFile,
			projectDir: PROJECT_DIR,
			scoped: true,
		});
		expect(result).toEqual(["npm", ["test", "--", "--run"]]);
	});

	it("détecte vitest via la devDependency même si le script ne le nomme pas", () => {
		const result = detect({
			exists: () => true,
			readFile: () =>
				JSON.stringify({
					scripts: { test: "run-tests" },
					devDependencies: { vitest: "^4" },
				}),
			projectDir: PROJECT_DIR,
			scoped: true,
		});
		expect(result).toEqual(["pnpm", ["test", "--", "--run", "--changed"]]);
	});
});

describe("run", () => {
	it("retourne null si aucun runner détecté", () => {
		const result = run(makeOpts({ hasPkg: false }));
		expect(result).toBeNull();
	});

	it("cible les tests liés aux changements quand git est dispo (vitest)", () => {
		const result = run(makeOpts({ spawnStatus: 0 }));
		expect(result.status).toBe(0);
		expect(result.runner[1]).toContain("--changed");
		expect(result.message).toContain("✓ Tests liés aux changements passés");
	});

	it("en worktree (tests depuis mainRoot) → suite complète, pas de ciblage git", () => {
		// node_modules absent dans projectDir → runDir = mainRoot ≠ projectDir.
		// vitest --changed y lirait le mauvais arbre git, on ne doit pas l'activer.
		const opts = makeOpts({ hasNodeModules: false, spawnStatus: 0 });
		const result = run(opts);
		expect(result.runner[1]).not.toContain("--changed");
	});

	it("relance la suite complète hors git (changed null)", () => {
		const opts = makeOpts({ spawnStatus: 0 });
		opts.changed = null;
		const result = run(opts);
		expect(result.status).toBe(0);
		expect(result.runner[1]).not.toContain("--changed");
		expect(result.message).toContain("✓ Tests passés");
	});

	it("retourne status non-0 et message échec quand les tests échouent", () => {
		const result = run(makeOpts({ spawnStatus: 1 }));
		expect(result.status).toBe(1);
		expect(result.message).toContain("ÉCHEC");
	});

	it("inclut la sortie du processus dans le message en cas d'échec", () => {
		const result = run(makeOpts({ spawnStatus: 1 }));
		expect(result.message).toContain("Error details");
	});

	it("utilise mainRoot si node_modules absent dans projectDir (worktree)", () => {
		const spawnCalls = [];
		const opts = {
			...makeOpts({ hasNodeModules: false }),
			spawn: (_cmd, _args, spawnOpts) => {
				spawnCalls.push(spawnOpts.cwd);
				return { status: 0, stdout: "ok", stderr: "" };
			},
		};
		run(opts);
		expect(spawnCalls[0]).toBe(MAIN_ROOT);
	});

	it("utilise projectDir si node_modules présent", () => {
		const spawnCalls = [];
		const opts = {
			...makeOpts({ hasNodeModules: true }),
			spawn: (_cmd, _args, spawnOpts) => {
				spawnCalls.push(spawnOpts.cwd);
				return { status: 0, stdout: "ok", stderr: "" };
			},
		};
		run(opts);
		expect(spawnCalls[0]).toBe(PROJECT_DIR);
	});

	it("court-circuite (null) si rien en attente", () => {
		const opts = {
			...makeOpts(),
			changed: [],
			spawn: () => {
				throw new Error("ne doit pas spawn");
			},
		};
		expect(run(opts)).toBeNull();
	});

	it("court-circuite (null) si seuls des fichiers docs/assets ont changé", () => {
		const opts = {
			...makeOpts(),
			changed: ["README.md", "docs/logo.svg"],
			spawn: () => {
				throw new Error("ne doit pas spawn");
			},
		};
		expect(run(opts)).toBeNull();
	});

	it("lance la suite si un fichier de code est en attente parmi des docs", () => {
		const opts = makeOpts({ spawnStatus: 0 });
		opts.changed = ["README.md", "src/app.ts"];
		expect(run(opts).status).toBe(0);
	});

	it("lance la suite hors dépôt git (changed null → comportement historique)", () => {
		const opts = makeOpts({ spawnStatus: 0 });
		opts.changed = null;
		expect(run(opts).status).toBe(0);
	});
});
