// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	analyzeSecurity,
	assertSafeTarget,
	buildContributionBranch,
	buildContributionPr,
	buildPostInstallHints,
	buildSecurityRows,
	buildSummaryRows,
	collectIncomingHooks,
	detectProjectSignals,
	detectScriptChanges,
	detectStacks,
	detectTestChanges,
	doInstallTests,
	doUpdateTests,
	extractFingerprint,
	filterHooksByStack,
	findInstalledSlugs,
	isBlockingEvent,
	isCodexScope,
	isGlobalScope,
	mergeHooks,
	PREREQ_HINTS,
	parseArgs,
	resolveContributionTarget,
	resolveScopeRoot,
	resolveScriptPath,
	resolveTestDest,
	scanInstalledHooks,
	shortRepo,
	snykVerdict,
	suggestHooksForSignals,
} from "../../packages/cli/bin/core.mjs";

const argv = (...a) => ["node", "cli.mjs", ...a];

describe("parseArgs", () => {
	it("parse --hooks= en liste", () => {
		expect(parseArgs(argv("install", "--hooks=a,b , c")).hooks).toEqual([
			"a",
			"b",
			"c",
		]);
	});
	it("parse --hooks séparé", () => {
		expect(parseArgs(argv("install", "--hooks", "a,b")).hooks).toEqual([
			"a",
			"b",
		]);
	});
	it("défaut scope project", () => {
		expect(parseArgs(argv("install")).scope).toBe("project");
	});
	it("--global bascule en global", () => {
		expect(parseArgs(argv("install", "--global")).scope).toBe("global");
	});
	it("--scope=global", () => {
		expect(parseArgs(argv("install", "--scope=global")).scope).toBe("global");
	});
	it("--scope invalide ignoré", () => {
		expect(parseArgs(argv("install", "--scope=root")).scope).toBe("project");
	});
	it("--copilot bascule en copilot", () => {
		expect(parseArgs(argv("install", "--copilot")).scope).toBe("copilot");
	});
	it("--codex-project bascule en codex-project", () => {
		expect(parseArgs(argv("install", "--codex-project")).scope).toBe(
			"codex-project",
		);
	});
	it("--codex-profile bascule en codex-profile", () => {
		expect(parseArgs(argv("install", "--codex-profile")).scope).toBe(
			"codex-profile",
		);
	});
	it("--scope=codex-project accepté", () => {
		expect(parseArgs(argv("install", "--scope=codex-project")).scope).toBe(
			"codex-project",
		);
	});
	it("--scope=copilot accepté", () => {
		expect(parseArgs(argv("install", "--scope=copilot")).scope).toBe("copilot");
	});
	it("-y active yes", () => {
		expect(parseArgs(argv("install", "-y")).yes).toBe(true);
	});
	it("flags version/help", () => {
		expect(parseArgs(argv("-v")).version).toBe(true);
		expect(parseArgs(argv("-h")).help).toBe(true);
	});
	it("premier token libre = commande", () => {
		expect(parseArgs(argv("install")).command).toBe("install");
	});
	it("--stacks= en liste", () => {
		expect(
			parseArgs(argv("install", "--stacks=typescript,python")).stacks,
		).toEqual(["typescript", "python"]);
	});
	it("défaut stacks vide", () => {
		expect(parseArgs(argv("install")).stacks).toEqual([]);
	});
	it("--no-detect", () => {
		expect(parseArgs(argv("install", "--no-detect")).noDetect).toBe(true);
	});
	it("défaut noDetect false", () => {
		expect(parseArgs(argv("install")).noDetect).toBe(false);
	});
	it("--stack défaut auto", () => {
		expect(parseArgs(argv("install")).stack).toBe("auto");
	});
	it("parse --stack=python", () => {
		expect(parseArgs(argv("install", "--stack=python")).stack).toBe("python");
	});
	it("parse --stack séparé", () => {
		expect(parseArgs(argv("install", "--stack", "typescript")).stack).toBe(
			"typescript",
		);
	});
	it("parse --language=all comme alias de --stack=all", () => {
		expect(parseArgs(argv("install", "--language=all")).stack).toBe("all");
	});
	it("--stack invalide ignoré (reste auto)", () => {
		expect(parseArgs(argv("install", "--stack=rust")).stack).toBe("auto");
	});
});

describe("detectStacks", () => {
	const fsWith = (present) => ({
		existsSync: (p) => present.some((name) => p.endsWith(name)),
	});

	it("package.json → typescript", () => {
		expect(detectStacks("/proj", fsWith(["package.json"]))).toEqual([
			"typescript",
		]);
	});
	it("pyproject.toml → python", () => {
		expect(detectStacks("/proj", fsWith(["pyproject.toml"]))).toEqual([
			"python",
		]);
	});
	it("les deux manifestes → les deux stacks", () => {
		expect(
			detectStacks("/proj", fsWith(["package.json", "requirements.txt"])),
		).toEqual(["typescript", "python"]);
	});
	it("aucun manifeste connu → []", () => {
		expect(detectStacks("/proj", fsWith([]))).toEqual([]);
	});
});

describe("filterHooksByStack", () => {
	const universal = { slug: "u" };
	const tsOnly = { slug: "ts", stack: ["typescript"] };
	const pyOnly = { slug: "py", stack: ["python"] };
	const hooks = [universal, tsOnly, pyOnly];

	it("stacks vide → aucun filtrage", () => {
		expect(filterHooksByStack(hooks, [])).toEqual(hooks);
	});
	it("stacks absent (undefined) → aucun filtrage", () => {
		expect(filterHooksByStack(hooks, undefined)).toEqual(hooks);
	});
	it("garde l'universel + le stack détecté, écarte le reste", () => {
		expect(filterHooksByStack(hooks, ["python"])).toEqual([universal, pyOnly]);
	});
	it("plusieurs stacks détectés → union", () => {
		expect(filterHooksByStack(hooks, ["typescript", "python"])).toEqual(hooks);
	});
});

describe("detectProjectSignals", () => {
	const ROOT = "/proj";
	const noPkg = () => {
		throw new Error("ENOENT");
	};
	// Fake readdirSync: path → [{ name, dir }] entries, matching the
	// `{ withFileTypes: true }` contract used by detectProjectSignals.
	const fakeReaddir = (entriesByPath) => (p) => entriesByPath[p] ?? [];
	const dir = (name) => ({
		name,
		isDirectory: () => true,
		isFile: () => false,
	});
	const file = (name) => ({
		name,
		isDirectory: () => false,
		isFile: () => true,
	});

	it("aucun signal sur un projet sans i18n ni okf", () => {
		const readdirSync = fakeReaddir({ [ROOT]: [file("README.md")] });
		expect(
			detectProjectSignals(ROOT, { readdirSync, readFileSync: noPkg }),
		).toEqual([]);
	});

	it("détecte i18n via un dossier locales à la racine", () => {
		const readdirSync = fakeReaddir({ [ROOT]: [dir("locales")] });
		expect(
			detectProjectSignals(ROOT, { readdirSync, readFileSync: noPkg }),
		).toEqual(["i18n"]);
	});

	it("détecte i18n via src/locales imbriqué (profondeur limitée)", () => {
		const readdirSync = fakeReaddir({
			[ROOT]: [dir("src")],
			"/proj/src": [dir("locales")],
		});
		expect(
			detectProjectSignals(ROOT, { readdirSync, readFileSync: noPkg }),
		).toEqual(["i18n"]);
	});

	it("détecte i18n via un package i18n dans package.json", () => {
		const readdirSync = fakeReaddir({ [ROOT]: [file("package.json")] });
		const readFileSync = () =>
			JSON.stringify({ dependencies: { "next-intl": "^3.0.0" } });
		expect(detectProjectSignals(ROOT, { readdirSync, readFileSync })).toEqual([
			"i18n",
		]);
	});

	it("ne confond pas un projet avec des packages non-i18n", () => {
		const readdirSync = fakeReaddir({ [ROOT]: [file("package.json")] });
		const readFileSync = () =>
			JSON.stringify({
				devDependencies: { lodash: "^4.0.0", typescript: "^5.0.0" },
			});
		expect(detectProjectSignals(ROOT, { readdirSync, readFileSync })).toEqual(
			[],
		);
	});

	it("détecte okf, OKF et .okf (insensible à la casse)", () => {
		for (const name of ["okf", "OKF", ".okf"]) {
			const readdirSync = fakeReaddir({ [ROOT]: [dir(name)] });
			expect(
				detectProjectSignals(ROOT, { readdirSync, readFileSync: noPkg }),
			).toEqual(["okf"]);
		}
	});

	it("détecte i18n + okf ensemble", () => {
		const readdirSync = fakeReaddir({
			[ROOT]: [dir("okf"), dir("src")],
			"/proj/src": [dir("messages")],
		});
		expect(
			detectProjectSignals(ROOT, { readdirSync, readFileSync: noPkg }),
		).toEqual(["i18n", "okf"]);
	});

	it("ne descend pas dans node_modules pour chercher i18n", () => {
		const readdirSync = fakeReaddir({
			[ROOT]: [dir("node_modules")],
			"/proj/node_modules": [dir("locales")],
		});
		expect(
			detectProjectSignals(ROOT, { readdirSync, readFileSync: noPkg }),
		).toEqual([]);
	});

	it("résiste à un dossier illisible", () => {
		const readdirSync = (p) => {
			if (p === ROOT) return [dir("src")];
			throw new Error("EACCES");
		};
		expect(
			detectProjectSignals(ROOT, { readdirSync, readFileSync: noPkg }),
		).toEqual([]);
	});

	it("détecte nextjs via la dépendance next", () => {
		const readdirSync = fakeReaddir({ [ROOT]: [file("package.json")] });
		const readFileSync = () =>
			JSON.stringify({ dependencies: { next: "^15.0.0" } });
		expect(detectProjectSignals(ROOT, { readdirSync, readFileSync })).toEqual([
			"nextjs",
		]);
	});

	it("détecte nextjs via next.config.mjs (sans dépendance)", () => {
		const readdirSync = fakeReaddir({ [ROOT]: [file("next.config.mjs")] });
		expect(
			detectProjectSignals(ROOT, { readdirSync, readFileSync: noPkg }),
		).toEqual(["nextjs"]);
	});

	it("détecte frontend via une dépendance react", () => {
		const readdirSync = fakeReaddir({ [ROOT]: [file("package.json")] });
		const readFileSync = () =>
			JSON.stringify({
				dependencies: { react: "^18.3.1", "react-dom": "^18.3.1" },
			});
		expect(detectProjectSignals(ROOT, { readdirSync, readFileSync })).toEqual([
			"frontend",
		]);
	});

	it("détecte github via un dossier .github", () => {
		const readdirSync = fakeReaddir({ [ROOT]: [dir(".github")] });
		expect(
			detectProjectSignals(ROOT, { readdirSync, readFileSync: noPkg }),
		).toEqual(["github"]);
	});

	it("détecte github via une remote git github.com", () => {
		const readdirSync = fakeReaddir({ [ROOT]: [dir(".git")] });
		const readFileSync = (p) => {
			if (p === "/proj/.git/config")
				return '[remote "origin"]\n\turl = git@github.com:acme/repo.git';
			throw new Error("ENOENT");
		};
		expect(detectProjectSignals(ROOT, { readdirSync, readFileSync })).toEqual([
			"github",
		]);
	});

	it("détecte github via un worktree (fichier gitdir)", () => {
		const readdirSync = fakeReaddir({ [ROOT]: [file(".git")] });
		const readFileSync = (p) => {
			if (p === "/proj/.git") return "gitdir: ../real-gitdir";
			// path.join normalizes the relative gitdir against the repo root.
			if (p === "/real-gitdir/config")
				return '[remote "origin"]\n\turl = https://github.com/acme/repo.git';
			throw new Error("ENOENT");
		};
		expect(detectProjectSignals(ROOT, { readdirSync, readFileSync })).toEqual([
			"github",
		]);
	});

	it("ne détecte pas github sur une remote non-GitHub", () => {
		const readdirSync = fakeReaddir({ [ROOT]: [dir(".git")] });
		const readFileSync = (p) => {
			if (p === "/proj/.git/config")
				return '[remote "origin"]\n\turl = git@gitlab.com:acme/repo.git';
			throw new Error("ENOENT");
		};
		expect(detectProjectSignals(ROOT, { readdirSync, readFileSync })).toEqual(
			[],
		);
	});

	it("cumule i18n + nextjs + frontend + github + okf sur un projet complet", () => {
		const readdirSync = fakeReaddir({
			[ROOT]: [dir("okf"), dir("src"), dir(".github"), file("package.json")],
			"/proj/src": [dir("locales")],
		});
		const readFileSync = () =>
			JSON.stringify({
				dependencies: { next: "^15.0.0", react: "^18.3.1" },
			});
		expect(detectProjectSignals(ROOT, { readdirSync, readFileSync })).toEqual([
			"frontend",
			"github",
			"i18n",
			"nextjs",
			"okf",
		]);
	});
});

describe("suggestHooksForSignals", () => {
	it("mappe i18n → stop-i18n-validation", () => {
		expect(suggestHooksForSignals(["i18n"])).toEqual(["stop-i18n-validation"]);
	});

	it("mappe okf → les trois hooks OKF", () => {
		expect(suggestHooksForSignals(["okf"])).toEqual([
			"okf-validate-on-change",
			"session-start-okf-staleness",
			"stop-okf-staleness-check",
		]);
	});

	it("exclut les slugs déjà sélectionnés", () => {
		expect(suggestHooksForSignals(["okf"], ["okf-validate-on-change"])).toEqual(
			["session-start-okf-staleness", "stop-okf-staleness-check"],
		);
	});

	it("ignore les signaux inconnus", () => {
		expect(suggestHooksForSignals(["cobol"], ["x"])).toEqual([]);
	});

	it("ne duplique pas un slug déjà suggéré", () => {
		expect(suggestHooksForSignals(["i18n", "i18n"])).toEqual([
			"stop-i18n-validation",
		]);
	});

	it("mappe nextjs → post-write-nextjs-quality", () => {
		expect(suggestHooksForSignals(["nextjs"])).toEqual([
			"post-write-nextjs-quality",
		]);
	});

	it("mappe frontend → post-edit-visual-check", () => {
		expect(suggestHooksForSignals(["frontend"])).toEqual([
			"post-edit-visual-check",
		]);
	});

	it("mappe github → session-start-github-context", () => {
		expect(suggestHooksForSignals(["github"])).toEqual([
			"session-start-github-context",
		]);
	});

	it("sans signaux → aucun slug", () => {
		expect(suggestHooksForSignals([])).toEqual([]);
	});
});

describe("resolveScopeRoot", () => {
	it("project → cwd/.claude", () => {
		const d = resolveScopeRoot("project", { cwd: "/proj", home: "/home/u" });
		expect(d.root).toBe("/proj");
		expect(d.settingsPath).toBe("/proj/.claude/settings.json");
		expect(d.hooksDir).toBe("/proj/.claude/hooks");
	});
	it("global → home/.claude", () => {
		const d = resolveScopeRoot("global", { cwd: "/proj", home: "/home/u" });
		expect(d.root).toBe("/home/u");
		expect(d.settingsPath).toBe("/home/u/.claude/settings.json");
		expect(d.format).toBe("claude");
	});
	it("copilot → cwd/.claude (format claude)", () => {
		const d = resolveScopeRoot("copilot", { cwd: "/proj", home: "/home/u" });
		expect(d.settingsPath).toBe("/proj/.claude/settings.json");
		expect(d.format).toBe("claude");
	});
	it("codex-project → cwd/.codex/hooks.json", () => {
		const d = resolveScopeRoot("codex-project", {
			cwd: "/proj",
			home: "/home/u",
		});
		expect(d.root).toBe("/proj");
		expect(d.settingsPath).toBe("/proj/.codex/hooks.json");
		expect(d.hooksDir).toBe("/proj/.codex/hooks");
		expect(d.format).toBe("codex");
	});
	it("codex-profile → home/.codex/hooks.json", () => {
		const d = resolveScopeRoot("codex-profile", {
			cwd: "/proj",
			home: "/home/u",
		});
		expect(d.root).toBe("/home/u");
		expect(d.settingsPath).toBe("/home/u/.codex/hooks.json");
		expect(d.format).toBe("codex");
	});
});

describe("isGlobalScope / isCodexScope", () => {
	it("global et codex-profile sont globaux", () => {
		expect(isGlobalScope("global")).toBe(true);
		expect(isGlobalScope("codex-profile")).toBe(true);
		expect(isGlobalScope("project")).toBe(false);
		expect(isGlobalScope("codex-project")).toBe(false);
	});
	it("codex-project et codex-profile sont codex", () => {
		expect(isCodexScope("codex-project")).toBe(true);
		expect(isCodexScope("codex-profile")).toBe(true);
		expect(isCodexScope("project")).toBe(false);
		expect(isCodexScope("copilot")).toBe(false);
	});
});

describe("resolveScriptPath", () => {
	it("claude : inchangé", () => {
		expect(resolveScriptPath(".claude/hooks/s.mjs", "project")).toBe(
			".claude/hooks/s.mjs",
		);
		expect(resolveScriptPath(".claude/hooks/s.mjs", "copilot")).toBe(
			".claude/hooks/s.mjs",
		);
	});
	it("codex : relocalise vers .codex/hooks", () => {
		expect(resolveScriptPath(".claude/hooks/s.mjs", "codex-project")).toBe(
			".codex/hooks/s.mjs",
		);
		expect(resolveScriptPath(".claude/hooks/s.mjs", "codex-profile")).toBe(
			".codex/hooks/s.mjs",
		);
	});
});

describe("assertSafeTarget", () => {
	it("accepte un chemin sous la racine", () => {
		expect(() =>
			assertSafeTarget("/proj", ".claude/hooks/x.mjs"),
		).not.toThrow();
	});
	it("rejette un chemin absolu", () => {
		expect(() => assertSafeTarget("/proj", "/etc/passwd")).toThrow(/absolute/);
	});
	it("rejette les segments ..", () => {
		expect(() => assertSafeTarget("/proj", "../../etc/x")).toThrow(/\.\./);
	});
	it("rejette une lettre de lecteur Windows", () => {
		expect(() => assertSafeTarget("/proj", "C:\\evil")).toThrow(
			/Windows|absolute/,
		);
	});
});

describe("mergeHooks", () => {
	it("fusionne par matcher sans écraser", () => {
		const existing = {
			PreToolUse: [{ matcher: "Bash", hooks: [{ command: "a" }] }],
		};
		const incoming = {
			PreToolUse: [{ matcher: "Bash", hooks: [{ command: "b" }] }],
		};
		const m = mergeHooks(existing, incoming);
		expect(m.PreToolUse[0].hooks).toHaveLength(2);
	});
	it("crée un nouvel event", () => {
		const m = mergeHooks({}, { Stop: [{ hooks: [{ command: "x" }] }] });
		expect(m.Stop).toHaveLength(1);
	});
	it("ne mute pas existing", () => {
		const existing = {
			PreToolUse: [{ matcher: "Bash", hooks: [{ command: "a" }] }],
		};
		mergeHooks(existing, {
			PreToolUse: [{ matcher: "Bash", hooks: [{ command: "b" }] }],
		});
		expect(existing.PreToolUse[0].hooks).toHaveLength(1);
	});
	it("idempotent — double install ne duplique pas les commandes", () => {
		const incoming = {
			PreToolUse: [{ matcher: "Bash", hooks: [{ command: "node hook.mjs" }] }],
		};
		const once = mergeHooks({}, incoming);
		const twice = mergeHooks(once, incoming);
		expect(twice.PreToolUse[0].hooks).toHaveLength(1);
	});
	it("idempotent — plusieurs events simultanés", () => {
		const incoming = {
			PreToolUse: [{ matcher: "Write", hooks: [{ command: "node a.mjs" }] }],
			Stop: [{ hooks: [{ command: "node b.mjs" }] }],
		};
		const once = mergeHooks({}, incoming);
		const twice = mergeHooks(once, incoming);
		expect(twice.PreToolUse[0].hooks).toHaveLength(1);
		expect(twice.Stop[0].hooks).toHaveLength(1);
	});
	it("conserve deux commandes différentes sous le même matcher", () => {
		const existing = { Stop: [{ hooks: [{ command: "node a.mjs" }] }] };
		const incoming = { Stop: [{ hooks: [{ command: "node b.mjs" }] }] };
		const m = mergeHooks(existing, incoming);
		expect(m.Stop[0].hooks).toHaveLength(2);
	});
});

describe("collectIncomingHooks", () => {
	const hooks = [
		{
			slug: "s",
			config: {
				hooks: {
					PreToolUse: [
						{
							matcher: "Bash",
							hooks: [
								{ command: "node $CLAUDE_PROJECT_DIR/.claude/hooks/s.mjs" },
							],
						},
					],
				},
			},
		},
	];
	it("project : conserve $CLAUDE_PROJECT_DIR", () => {
		const out = collectIncomingHooks(hooks, { scope: "project" });
		expect(out.PreToolUse[0].hooks[0].command).toContain("$CLAUDE_PROJECT_DIR");
	});
	it("global : réécrit vers la racine absolue", () => {
		const out = collectIncomingHooks(hooks, {
			scope: "global",
			globalRoot: "/home/u",
		});
		expect(out.PreToolUse[0].hooks[0].command).toBe(
			"node /home/u/.claude/hooks/s.mjs",
		);
	});
	it("copilot : retire $CLAUDE_PROJECT_DIR/", () => {
		const out = collectIncomingHooks(hooks, { scope: "copilot" });
		expect(out.PreToolUse[0].hooks[0].command).toBe("node .claude/hooks/s.mjs");
	});
	// biome-ignore lint/suspicious/noTemplateCurlyInString: literal shell-style ${VAR} syntax under test, not JS interpolation
	it("copilot : retire aussi la forme ${CLAUDE_PROJECT_DIR}/", () => {
		const h = [
			{
				slug: "s",
				config: {
					hooks: {
						Stop: [
							{
								hooks: [
									// biome-ignore lint/suspicious/noTemplateCurlyInString: literal shell-style ${VAR} syntax under test, not JS interpolation
									{ command: "node ${CLAUDE_PROJECT_DIR}/.claude/hooks/s.mjs" },
								],
							},
						],
					},
				},
			},
		];
		const out = collectIncomingHooks(h, { scope: "copilot" });
		expect(out.Stop[0].hooks[0].command).toBe("node .claude/hooks/s.mjs");
	});
	it("codex-project : réécrit .claude/ en .codex/ (relatif)", () => {
		const out = collectIncomingHooks(hooks, { scope: "codex-project" });
		expect(out.PreToolUse[0].hooks[0].command).toBe("node .codex/hooks/s.mjs");
	});
	it("codex-profile : réécrit vers <home>/.codex/ (absolu)", () => {
		const out = collectIncomingHooks(hooks, {
			scope: "codex-profile",
			globalRoot: "/home/u",
		});
		expect(out.PreToolUse[0].hooks[0].command).toBe(
			"node /home/u/.codex/hooks/s.mjs",
		);
	});
	// biome-ignore lint/suspicious/noTemplateCurlyInString: literal shell-style ${VAR} syntax under test, not JS interpolation
	it("codex : gère aussi la forme ${CLAUDE_PROJECT_DIR}/", () => {
		const h = [
			{
				slug: "s",
				config: {
					hooks: {
						Stop: [
							{
								hooks: [
									// biome-ignore lint/suspicious/noTemplateCurlyInString: literal shell-style ${VAR} syntax under test, not JS interpolation
									{ command: "node ${CLAUDE_PROJECT_DIR}/.claude/hooks/s.mjs" },
								],
							},
						],
					},
				},
			},
		];
		const out = collectIncomingHooks(h, { scope: "codex-project" });
		expect(out.Stop[0].hooks[0].command).toBe("node .codex/hooks/s.mjs");
	});
	it("ignore les hooks sans fragment config", () => {
		expect(collectIncomingHooks([{ slug: "x" }], {})).toEqual({});
	});

	it("python : réécrit node … .mjs en python3 … .py (variante dispo)", () => {
		const h = [
			{
				slug: "s",
				python_script_path: ".claude/hooks/s.py",
				python_code_snippet: "#!/usr/bin/env python3\n",
				config: {
					hooks: {
						PreToolUse: [
							{
								matcher: "Bash",
								hooks: [
									{ command: "node $CLAUDE_PROJECT_DIR/.claude/hooks/s.mjs" },
								],
							},
						],
					},
				},
			},
		];
		const out = collectIncomingHooks(h, { scope: "project", python: true });
		expect(out.PreToolUse[0].hooks[0].command).toBe(
			"python3 $CLAUDE_PROJECT_DIR/.claude/hooks/s.py",
		);
	});

	it("python : garde node … .mjs quand le hook n'a pas de variante python", () => {
		const h = [
			{
				slug: "s",
				config: {
					hooks: {
						Stop: [
							{
								hooks: [
									{ command: "node $CLAUDE_PROJECT_DIR/.claude/hooks/s.mjs" },
								],
							},
						],
					},
				},
			},
		];
		const out = collectIncomingHooks(h, { scope: "project", python: true });
		expect(out.Stop[0].hooks[0].command).toContain("node $CLAUDE_PROJECT_DIR");
	});

	it("python : la réécriture survit à la relocalisation codex", () => {
		const h = [
			{
				slug: "s",
				python_script_path: ".claude/hooks/s.py",
				python_code_snippet: "#!/usr/bin/env python3\n",
				config: {
					hooks: {
						PreToolUse: [
							{
								matcher: "Bash",
								hooks: [
									{ command: "node $CLAUDE_PROJECT_DIR/.claude/hooks/s.mjs" },
								],
							},
						],
					},
				},
			},
		];
		const out = collectIncomingHooks(h, { scope: "codex-project", python: true });
		expect(out.PreToolUse[0].hooks[0].command).toBe(
			"python3 .codex/hooks/s.py",
		);
	});
});

describe("analyzeSecurity", () => {
	it("détecte le shell", () => {
		expect(analyzeSecurity('execSync("ls")').shell).toBe(true);
		expect(analyzeSecurity("import { spawn } from 'child_process'").shell).toBe(
			true,
		);
	});
	it("détecte le réseau", () => {
		expect(analyzeSecurity("await fetch(url)").network).toBe(true);
		expect(analyzeSecurity("import https from 'node:https'").network).toBe(
			true,
		);
	});
	it("détecte les écritures fs", () => {
		expect(analyzeSecurity("writeFileSync(p, x)").fsWrite).toBe(true);
	});
	it("code anodin → tout faux", () => {
		expect(analyzeSecurity("const x = 1 + 1")).toEqual({
			shell: false,
			network: false,
			fsWrite: false,
		});
	});
	it("snippet absent → tout faux", () => {
		expect(analyzeSecurity(undefined).shell).toBe(false);
	});
});

describe("snykVerdict", () => {
	it("absent → placeholder", () => {
		expect(snykVerdict(undefined)).toEqual({ label: "—", level: "unknown" });
	});
	it("0 finding → Safe", () => {
		expect(snykVerdict({ high: 0, medium: 0, low: 0 }).level).toBe("safe");
	});
	it("priorité high > medium > low", () => {
		expect(snykVerdict({ high: 1, medium: 5, low: 9 }).level).toBe("high");
		expect(snykVerdict({ high: 0, medium: 2, low: 9 }).level).toBe("medium");
		expect(snykVerdict({ high: 0, medium: 0, low: 1 }).level).toBe("low");
	});
});

describe("shortRepo", () => {
	it("raccourcit une URL github", () => {
		expect(
			shortRepo("https://github.com/disler/claude-code-hooks-mastery"),
		).toBe("disler/claude-code-hooks-mastery");
	});
	it("retire .git final", () => {
		expect(shortRepo("https://github.com/a/b.git")).toBe("a/b");
	});
	it("null → null", () => {
		expect(shortRepo(null)).toBeNull();
	});
});

describe("isBlockingEvent", () => {
	it("PreToolUse bloque, PostToolUse non", () => {
		expect(isBlockingEvent("PreToolUse")).toBe(true);
		expect(isBlockingEvent("PostToolUse")).toBe(false);
	});
});

describe("buildSummaryRows", () => {
	it("compose chemin, events, blocking et source", () => {
		const rows = buildSummaryRows(
			[
				{
					slug: "s",
					name: "S",
					script_path: ".claude/hooks/s.mjs",
					category: "security",
					trigger: "Bash",
					config: { hooks: { PreToolUse: [{ hooks: [] }] } },
					community_examples: [{ repo: "https://github.com/a/b" }],
				},
			],
			{ root: "/proj" },
		);
		expect(rows[0]).toMatchObject({
			path: "/proj/.claude/hooks/s.mjs",
			blocking: true,
			matcher: "Bash",
			source: "a/b",
			events: ["PreToolUse"],
		});
	});
});

describe("buildSecurityRows", () => {
	it("combine analyse locale et verdict snyk", () => {
		const rows = buildSecurityRows([
			{
				slug: "s",
				name: "S",
				code_snippet: 'execSync("x")',
				security: { snyk: { high: 0, medium: 1, low: 0 } },
			},
		]);
		expect(rows[0].shell).toBe(true);
		expect(rows[0].snyk.level).toBe("medium");
	});
});

describe("buildPostInstallHints", () => {
	it("retourne vide si aucun hook avec prérequis", () => {
		expect(buildPostInstallHints([{ slug: "guard-push-main" }])).toEqual([]);
	});

	it("retourne un hint pour stop-duplication-check", () => {
		const hints = buildPostInstallHints([{ slug: "stop-duplication-check" }]);
		expect(hints).toHaveLength(1);
		expect(hints[0].slug).toBe("stop-duplication-check");
		expect(hints[0].hint).toContain("jscpd");
	});

	it("ignore les hooks sans entrée PREREQ_HINTS", () => {
		const hooks = [
			{ slug: "detect-secrets" },
			{ slug: "stop-duplication-check" },
		];
		const hints = buildPostInstallHints(hooks);
		expect(hints).toHaveLength(1);
		expect(hints[0].slug).toBe("stop-duplication-check");
	});

	it("PREREQ_HINTS contient une commande pnpm ou npm pour jscpd", () => {
		expect(PREREQ_HINTS["stop-duplication-check"]).toMatch(/pnpm|npm/);
	});

	it("retourne un hint pour notification-sound avec brew", () => {
		const hints = buildPostInstallHints([{ slug: "notification-sound" }]);
		expect(hints).toHaveLength(1);
		expect(hints[0].slug).toBe("notification-sound");
		expect(hints[0].hint).toContain("brew install terminal-notifier");
	});

	it("hint notification-sound mentionne le bénéfice click-to-focus", () => {
		expect(PREREQ_HINTS["notification-sound"]).toMatch(/click-to-focus/);
	});

	it("retourne les deux hints si les deux hooks sont présents", () => {
		const hooks = [
			{ slug: "stop-duplication-check" },
			{ slug: "notification-sound" },
		];
		const hints = buildPostInstallHints(hooks);
		expect(hints).toHaveLength(2);
		expect(hints.map((h) => h.slug)).toEqual([
			"stop-duplication-check",
			"notification-sound",
		]);
	});
});

describe("extractFingerprint", () => {
	it("lit le slug en ligne 2", () => {
		expect(
			extractFingerprint(
				"#!/usr/bin/env node\n// @hookstack my-hook\nconsole.log(1)",
			),
		).toBe("my-hook");
	});
	it("retourne null si pas de fingerprint", () => {
		expect(
			extractFingerprint("#!/usr/bin/env node\nconsole.log(1)"),
		).toBeNull();
	});
	it("retourne null sur contenu vide", () => {
		expect(extractFingerprint("")).toBeNull();
		expect(extractFingerprint(undefined)).toBeNull();
	});
});

describe("findInstalledSlugs", () => {
	it("extrait les slugs des .mjs fingerprintés", () => {
		const files = {
			"a.mjs": "#!/usr/bin/env node\n// @hookstack hook-a\n",
			"b.mjs": "#!/usr/bin/env node\n// @hookstack hook-b\n",
		};
		const slugs = findInstalledSlugs("/proj/.claude/hooks", {
			readdirSync: () => Object.keys(files),
			readFileSync: (p) => files[p.split("/").pop()],
		});
		expect(slugs).toEqual(["hook-a", "hook-b"]);
	});
	it("ignore les fichiers non-.mjs et sans fingerprint", () => {
		const files = {
			"a.mjs": "#!/usr/bin/env node\nno fingerprint here\n",
			"readme.txt": "x",
		};
		const slugs = findInstalledSlugs("/proj/.claude/hooks", {
			readdirSync: () => Object.keys(files),
			readFileSync: (p) => files[p.split("/").pop()],
		});
		expect(slugs).toEqual([]);
	});
	it("retourne [] si le dossier n’existe pas", () => {
		const slugs = findInstalledSlugs("/missing", {
			readdirSync: () => {
				throw new Error("ENOENT");
			},
			readFileSync: () => "",
		});
		expect(slugs).toEqual([]);
	});
	it("reconnaît le fingerprint des variantes python (# @hookstack)", () => {
		const files = {
			"a.py": "#!/usr/bin/env python3\n# @hookstack hook-a\n",
			"b.mjs": "#!/usr/bin/env node\n// @hookstack hook-b\n",
		};
		const slugs = findInstalledSlugs("/proj/.claude/hooks", {
			readdirSync: () => Object.keys(files),
			readFileSync: (p) => files[p.split("/").pop()],
		});
		expect(slugs).toEqual(["hook-a", "hook-b"]);
	});
});
describe("scanInstalledHooks", () => {
	it("retourne slug + nom de fichier réel, même renommé", () => {
		const files = {
			"biome-check.mjs":
				"#!/usr/bin/env node\n// @hookstack post-write-biome\n",
			"quality-check.mjs":
				"#!/usr/bin/env node\n// @hookstack stop-quality-check\n",
		};
		const hooks = scanInstalledHooks("/proj/.claude/hooks", {
			readdirSync: () => Object.keys(files),
			readFileSync: (p) => files[p.split("/").pop()],
		});
		expect(hooks).toEqual([
			{ slug: "post-write-biome", file: "biome-check.mjs" },
			{ slug: "stop-quality-check", file: "quality-check.mjs" },
		]);
	});
	it("déduplique par slug (premier fichier gagne)", () => {
		const files = {
			"a.mjs": "#!/usr/bin/env node\n// @hookstack dup\n",
			"b.mjs": "#!/usr/bin/env node\n// @hookstack dup\n",
		};
		const hooks = scanInstalledHooks("/proj/.claude/hooks", {
			readdirSync: () => Object.keys(files),
			readFileSync: (p) => files[p.split("/").pop()],
		});
		expect(hooks).toEqual([{ slug: "dup", file: "a.mjs" }]);
	});
	it("le fichier canonique <slug>.mjs gagne sur un fichier renommé", () => {
		const files = {
			"biome-check.mjs":
				"#!/usr/bin/env node\n// @hookstack post-write-biome\n",
			"post-write-biome.mjs":
				"#!/usr/bin/env node\n// @hookstack post-write-biome\n",
		};
		const hooks = scanInstalledHooks("/proj/.claude/hooks", {
			readdirSync: () => Object.keys(files),
			readFileSync: (p) => files[p.split("/").pop()],
		});
		expect(hooks).toEqual([
			{ slug: "post-write-biome", file: "post-write-biome.mjs" },
		]);
	});
	it("ignore les fichiers non-.mjs et sans fingerprint", () => {
		const files = {
			"plain.mjs": "#!/usr/bin/env node\nno fingerprint here\n",
			"readme.txt": "x",
		};
		const hooks = scanInstalledHooks("/proj/.claude/hooks", {
			readdirSync: () => Object.keys(files),
			readFileSync: (p) => files[p.split("/").pop()],
		});
		expect(hooks).toEqual([]);
	});
	it("retourne [] si le dossier n'existe pas", () => {
		const hooks = scanInstalledHooks("/missing", {
			readdirSync: () => {
				throw new Error("ENOENT");
			},
			readFileSync: () => "",
		});
		expect(hooks).toEqual([]);
	});
});

describe("detectScriptChanges", () => {
	it("classe en changed si le contenu disque diffère", () => {
		const hooks = [
			{
				slug: "a",
				script_path: ".claude/hooks/a.mjs",
				code_snippet: "new code",
			},
		];
		const { changed, unchanged } = detectScriptChanges(
			hooks,
			"project",
			"/proj",
			{
				readFileSync: () => "old code",
			},
		);
		expect(changed).toEqual(["a"]);
		expect(unchanged).toEqual([]);
	});
	it("classe en unchanged si le contenu disque est identique", () => {
		const hooks = [
			{ slug: "a", script_path: ".claude/hooks/a.mjs", code_snippet: "same" },
		];
		const { changed, unchanged } = detectScriptChanges(
			hooks,
			"project",
			"/proj",
			{
				readFileSync: () => "same",
			},
		);
		expect(changed).toEqual([]);
		expect(unchanged).toEqual(["a"]);
	});
	it("traite un fichier absent comme changed", () => {
		const hooks = [
			{ slug: "a", script_path: ".claude/hooks/a.mjs", code_snippet: "new" },
		];
		const { changed } = detectScriptChanges(hooks, "project", "/proj", {
			readFileSync: () => {
				throw new Error("ENOENT");
			},
		});
		expect(changed).toEqual(["a"]);
	});
	it("ignore les hooks settings-only (sans script)", () => {
		const hooks = [{ slug: "a" }];
		const { changed, unchanged } = detectScriptChanges(
			hooks,
			"project",
			"/proj",
			{ readFileSync: () => "" },
		);
		expect(changed).toEqual([]);
		expect(unchanged).toEqual([]);
	});
	it("fileBySlug : lit le fichier réel quand le hook a été renommé", () => {
		const hooks = [
			{
				slug: "post-write-biome",
				script_path: ".claude/hooks/post-write-biome.mjs",
				code_snippet: "renamed content",
			},
		];
		const { changed, unchanged } = detectScriptChanges(
			hooks,
			"project",
			"/proj",
			{
				readFileSync: (p) => {
					if (p.endsWith("biome-check.mjs")) return "renamed content";
					throw new Error("ENOENT");
				},
				fileBySlug: {
					"post-write-biome": "/proj/.claude/hooks/biome-check.mjs",
				},
			},
		);
		expect(changed).toEqual([]);
		expect(unchanged).toEqual(["post-write-biome"]);
	});
	it("fileBySlug : classé changed si le fichier renommé diverge", () => {
		const hooks = [
			{
				slug: "post-write-biome",
				script_path: ".claude/hooks/post-write-biome.mjs",
				code_snippet: "registry version",
			},
		];
		const { changed } = detectScriptChanges(hooks, "project", "/proj", {
			readFileSync: (p) =>
				p.endsWith("biome-check.mjs") ? "my local edits" : "registry version",
			fileBySlug: { "post-write-biome": "/proj/.claude/hooks/biome-check.mjs" },
		});
		expect(changed).toEqual(["post-write-biome"]);
	});
});

describe("detectScriptChanges (python)", () => {
	it("compare la variante .py quand python est actif", () => {
		const hooks = [
			{
				slug: "a",
				script_path: ".claude/hooks/a.mjs",
				code_snippet: "mjs code",
				python_script_path: ".claude/hooks/a.py",
				python_code_snippet: "py code",
			},
		];
		const { changed } = detectScriptChanges(hooks, "project", "/proj", {
			readFileSync: () => "py code",
			python: true,
		});
		expect(changed).toEqual([]);
	});
	it("sans python, compare le .mjs", () => {
		const hooks = [
			{
				slug: "a",
				script_path: ".claude/hooks/a.mjs",
				code_snippet: "mjs code",
				python_script_path: ".claude/hooks/a.py",
				python_code_snippet: "py code",
			},
		];
		const { changed } = detectScriptChanges(hooks, "project", "/proj", {
			readFileSync: () => "py code",
		});
		expect(changed).toEqual(["a"]);
	});
});

describe("doInstallTests (python)", () => {
	it("écrit des tests pytest (test_<slug>.py) pour les variantes python, jamais de vitest", () => {
		const written = {};
		const hooks = [
			{ slug: "py-hook", python_test_snippet: "def test_x(): pass" },
			{ slug: "no-py-variant", test_snippet: "vitest code" },
		];
		const result = doInstallTests(
			hooks,
			"/proj",
			{
				mkdirSync: () => {},
				writeFileSync: (p, content) => {
					written[p] = content;
				},
				join: (...parts) => parts.join("/"),
			},
			{ python: true },
		);
		expect(result.testCount).toBe(1);
		expect(written["/proj/tests/hooks/test_py-hook.py"]).toBe(
			"def test_x(): pass",
		);
		expect(Object.keys(written).some((p) => p.endsWith(".test.mjs"))).toBe(
			false,
		);
	});
});

describe("doUpdateTests", () => {
	it("réécrit seulement les fichiers de test déjà présents", () => {
		const written = {};
		const hooks = [
			{ slug: "has-test", test_snippet: "test a" },
			{ slug: "no-existing-file", test_snippet: "test b" },
			{ slug: "no-snippet" },
		];
		const result = doUpdateTests(hooks, "/proj", {
			existsSync: (p) => p.endsWith("has-test.test.mjs"),
			writeFileSync: (p, content) => {
				written[p] = content;
			},
			join: (...parts) => parts.join("/"),
		});
		expect(result.testCount).toBe(1);
		expect(written["/proj/tests/hooks/has-test.test.mjs"]).toBe("test a");
		expect(
			written["/proj/tests/hooks/no-existing-file.test.mjs"],
		).toBeUndefined();
	});
});

describe("buildContributionBranch", () => {
	it("joint les slugs avec un préfixe stable", () => {
		expect(buildContributionBranch(["pre-bash-secret-detection"])).toBe(
			"hookstack-contrib/pre-bash-secret-detection",
		);
	});
	it("joint plusieurs slugs avec des tirets", () => {
		expect(buildContributionBranch(["a", "b"])).toBe("hookstack-contrib/a-b");
	});
});

describe("resolveContributionTarget", () => {
	it("clone la propre fork quand l'utilisateur n'est pas le owner", () => {
		const result = resolveContributionTarget(
			"contributor",
			"steve-magne/hookstack",
		);
		expect(result).toEqual({
			isOwner: false,
			cloneRepo: "contributor/hookstack",
		});
	});
	it("clone le repo upstream directement quand l'utilisateur est le owner", () => {
		const result = resolveContributionTarget(
			"steve-magne",
			"steve-magne/hookstack",
		);
		expect(result).toEqual({
			isOwner: true,
			cloneRepo: "steve-magne/hookstack",
		});
	});
	it("compare le login insensible à la casse", () => {
		const result = resolveContributionTarget(
			"Steve-Magne",
			"steve-magne/hookstack",
		);
		expect(result.isOwner).toBe(true);
	});
});

describe("buildContributionPr", () => {
	it("titre singulier pour un seul hook", () => {
		const { title } = buildContributionPr(["a"]);
		expect(title).toBe("Update hook: a");
	});
	it("titre pluriel et corps listant chaque slug", () => {
		const { title, body } = buildContributionPr(["a", "b"]);
		expect(title).toBe("Update hooks: a, b");
		expect(body).toContain("- `a`");
		expect(body).toContain("- `b`");
		expect(body).toContain("npx hookstack-cli@latest contribute");
	});
	it("liste les tests inclus quand withTests est fourni", () => {
		const { body } = buildContributionPr(["a", "b"], {
			withTests: ["tests/hooks/a.test.mjs"],
		});
		expect(body).toContain("Unit tests updated:");
		expect(body).toContain("- `tests/hooks/a.test.mjs`");
		expect(body).not.toContain("- `tests/hooks/b.test.mjs`");
	});
	it("n'ajoute pas de section tests par défaut", () => {
		const { body } = buildContributionPr(["a"]);
		expect(body).not.toContain("Unit tests updated:");
	});
});

describe("detectTestChanges", () => {
	it("signale un test local qui diffère du registre", () => {
		const hooks = [{ slug: "a", test_snippet: "published test" }];
		const changed = detectTestChanges(hooks, "/proj", {
			readFileSync: () => "edited test",
		});
		expect(changed).toEqual(["a"]);
	});
	it("ignore un test identique au registre", () => {
		const hooks = [{ slug: "a", test_snippet: "same" }];
		const changed = detectTestChanges(hooks, "/proj", {
			readFileSync: () => "same",
		});
		expect(changed).toEqual([]);
	});
	it("ignore un hook sans test local", () => {
		const hooks = [{ slug: "a", test_snippet: "published" }];
		const changed = detectTestChanges(hooks, "/proj", {
			readFileSync: () => {
				throw new Error("ENOENT");
			},
		});
		expect(changed).toEqual([]);
	});
	it("signale un test local quand le registre n'en a pas", () => {
		const hooks = [{ slug: "a" }];
		const changed = detectTestChanges(hooks, "/proj", {
			readFileSync: () => "brand new test",
		});
		expect(changed).toEqual(["a"]);
	});
	it("trouve un test nommé d'après le basename du script", () => {
		const hooks = [
			{
				slug: "pre-bash-secret-detection",
				script_path: ".claude/hooks/detect-secrets.mjs",
				test_snippet: "published",
			},
		];
		const changed = detectTestChanges(hooks, "/proj", {
			readFileSync: (p) => {
				if (p.endsWith("detect-secrets.test.mjs")) return "edited";
				throw new Error("ENOENT");
			},
		});
		expect(changed).toEqual(["pre-bash-secret-detection"]);
	});

	it("trouve un test nommé d'après le fichier réellement installé (renommé)", () => {
		// Miroir test du fix #227 : quand l'utilisateur renomme le hook .mjs installé
		// (post-write-biome.mjs → biome-check.mjs) et son test avec, le fingerprint
		// reste la source de vérité et le test renommé doit être détecté via hook.file.
		const hooks = [
			{
				slug: "post-write-biome",
				script_path: ".claude/hooks/post-write-biome.mjs",
				file: "/proj/.claude/hooks/biome-check.mjs",
				test_snippet: "published",
			},
		];
		const changed = detectTestChanges(hooks, "/proj", {
			readFileSync: (p) => {
				if (p.endsWith("biome-check.test.mjs")) return "edited";
				throw new Error("ENOENT");
			},
		});
		expect(changed).toEqual(["post-write-biome"]);
	});
});

describe("resolveTestDest", () => {
	const hook = {
		slug: "pre-bash-secret-detection",
		script_path: ".claude/hooks/detect-secrets.mjs",
	};
	it("préfère le test nommé par slug", () => {
		const dest = resolveTestDest(hook, "/proj", {
			existsSync: (p) => p.endsWith("pre-bash-secret-detection.test.mjs"),
		});
		expect(dest).toBe("/proj/tests/hooks/pre-bash-secret-detection.test.mjs");
	});
	it("retombe sur le test nommé par basename", () => {
		const dest = resolveTestDest(hook, "/proj", {
			existsSync: (p) => p.endsWith("detect-secrets.test.mjs"),
		});
		expect(dest).toBe("/proj/tests/hooks/detect-secrets.test.mjs");
	});
	it("retourne le chemin slug si aucun test n'existe (création)", () => {
		const dest = resolveTestDest(hook, "/proj", { existsSync: () => false });
		expect(dest).toBe("/proj/tests/hooks/pre-bash-secret-detection.test.mjs");
	});
	it("préfère le test nommé d'après le fichier renommé s'il existe", () => {
		const renamedHook = {
			slug: "post-write-biome",
			script_path: ".claude/hooks/post-write-biome.mjs",
			file: "/proj/.claude/hooks/biome-check.mjs",
		};
		const dest = resolveTestDest(renamedHook, "/proj", {
			existsSync: (p) => p.endsWith("biome-check.test.mjs"),
		});
		expect(dest).toBe("/proj/tests/hooks/biome-check.test.mjs");
	});
});
