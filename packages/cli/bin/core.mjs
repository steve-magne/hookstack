// Pure, dependency-free logic for the hookstack CLI.
// Everything here is side-effect free and unit-tested in isolation; the
// interactive I/O (clack/picocolors, fs, fetch) lives in cli.mjs. This mirrors
// the project's "pure run() + thin I/O guard" hook convention.
import { basename, isAbsolute, join, relative, resolve } from "node:path";

const BLOCKING_EVENTS = new Set([
	"PreToolUse",
	"UserPromptSubmit",
	"PreCompact",
	"PermissionRequest",
]);

// Matches $CLAUDE_PROJECT_DIR and ${CLAUDE_PROJECT_DIR}.
export const PROJECT_DIR_RE = /\$\{?CLAUDE_PROJECT_DIR\}?/g;
// Matches the "$CLAUDE_PROJECT_DIR/.claude/" prefix — rewritten to ".codex/" for
// Codex installs so scripts resolve under the Codex agent directory instead.
const CLAUDE_PREFIX_RE = /\$\{?CLAUDE_PROJECT_DIR\}?\/\.claude\//g;

// All recognized install scopes. Claude-family: project, global, copilot
// (settings.json under .claude). Codex-family: codex-project, codex-profile
// (hooks.json under .codex, events at the top level).
export const SCOPES = new Set([
	"project",
	"global",
	"copilot",
	"codex-project",
	"codex-profile",
]);
const GLOBAL_SCOPES = new Set(["global", "codex-profile"]);
const CODEX_SCOPES = new Set(["codex-project", "codex-profile"]);

export const isGlobalScope = (scope) => GLOBAL_SCOPES.has(scope);
export const isCodexScope = (scope) => CODEX_SCOPES.has(scope);

function splitList(raw) {
	return raw
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

export function parseArgs(argv) {
	const args = argv.slice(2);
	const result = {
		command: null,
		hooks: [],
		help: false,
		version: false,
		scope: "project",
		stack: "auto",
		yes: false,
		withTests: false,
		stacks: [],
		noDetect: false,
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--help" || arg === "-h") {
			result.help = true;
			continue;
		}
		if (arg === "--version" || arg === "-v") {
			result.version = true;
			continue;
		}
		if (arg === "--yes" || arg === "-y") {
			result.yes = true;
			continue;
		}
		if (arg === "--with-tests") {
			result.withTests = true;
			continue;
		}
		if (arg === "--no-detect") {
			result.noDetect = true;
			continue;
		}
		if (arg.startsWith("--stacks=")) {
			result.stacks = splitList(arg.slice("--stacks=".length));
			continue;
		}
		if (arg.startsWith("--stack=") || arg.startsWith("--language=")) {
			const v = (arg.includes("--stack=")
				? arg.slice("--stack=".length)
				: arg.slice("--language=".length)
			).toLowerCase();
			if (["auto", "typescript", "python", "java", "all"].includes(v)) {
				result.stack = v;
			}
			continue;
		}
		if ((arg === "--stack" || arg === "--language") && args[i + 1]) {
			const v = args[++i].toLowerCase();
			if (["auto", "typescript", "python", "java", "all"].includes(v)) {
				result.stack = v;
			}
			continue;
		}
		if (arg === "--global" || arg === "-g") {
			result.scope = "global";
			continue;
		}
		if (arg === "--project") {
			result.scope = "project";
			continue;
		}
		if (arg === "--copilot") {
			result.scope = "copilot";
			continue;
		}
		if (arg === "--codex-profile") {
			result.scope = "codex-profile";
			continue;
		}
		if (arg === "--codex-project") {
			result.scope = "codex-project";
			continue;
		}
		if (arg.startsWith("--scope=")) {
			const v = arg.slice("--scope=".length);
			if (SCOPES.has(v)) result.scope = v;
			continue;
		}
		if (arg.startsWith("--hooks=")) {
			result.hooks = splitList(arg.slice("--hooks=".length));
			continue;
		}
		if (arg === "--hooks" && args[i + 1]) {
			result.hooks = splitList(args[++i]);
			continue;
		}
		if (!result.command) result.command = arg;
	}

	return result;
}

// Resolves where the agent directory lives for a given scope.
// Project/copilot → cwd; global/codex-profile → home.
// Claude-family uses .claude/settings.json; Codex-family uses .codex/hooks.json.
// `claudeDir`/`settingsPath` keys are kept for back-compat (they hold the agent
// dir and config-file path regardless of which agent it targets).
export function resolveScopeRoot(scope, { cwd, home }) {
	const root = isGlobalScope(scope) ? home : cwd;
	const codex = isCodexScope(scope);
	const agentDir = join(root, codex ? ".codex" : ".claude");
	return {
		scope,
		root,
		format: codex ? "codex" : "claude",
		claudeDir: agentDir,
		hooksDir: join(agentDir, "hooks"),
		settingsPath: join(agentDir, codex ? "hooks.json" : "settings.json"),
	};
}

// Rejects target paths that would escape destDir, even if the registry JSON was
// tampered with. Adapted from hyperframes' installer.assertSafeTarget.
export function assertSafeTarget(destDir, target) {
	if (isAbsolute(target)) {
		throw new Error(`Unsafe path "${target}": absolute paths are not allowed.`);
	}
	if (/(^|[/\\])\.\.([/\\]|$)/.test(target)) {
		throw new Error(`Unsafe path "${target}": ".." segments are not allowed.`);
	}
	if (/^[A-Za-z]:[/\\]/.test(target)) {
		throw new Error(
			`Unsafe path "${target}": Windows drive letters are not allowed.`,
		);
	}
	const resolved = resolve(destDir, target);
	const rel = relative(resolve(destDir), resolved);
	if (rel.startsWith("..") || isAbsolute(rel)) {
		throw new Error(`Unsafe path "${target}": resolves outside ${destDir}.`);
	}
}

// ── stack detection ─────────────────────────────────────────────────────────
// Manifest-based signals only (not file extensions — a stray .py script in a
// TypeScript repo shouldn't flip the detection). One matching manifest is
// enough; keep in sync with the registry's `stack` enum (registry.schema.json).
// Note: `typescript` here means the node/JS/TS ecosystem — a bare package.json
// (JS-only project) still belongs to it: the node hooks (biome, npm install…)
// run fine there and the tsc-based ones self-guard on tsconfig presence.
const STACK_MANIFESTS = {
	typescript: ["package.json", "tsconfig.json", "pnpm-workspace.yaml"],
	python: [
		"pyproject.toml",
		"requirements.txt",
		"setup.py",
		"Pipfile",
		"uv.lock",
	],
	java: [
		"pom.xml",
		"build.gradle",
		"build.gradle.kts",
		"settings.gradle",
		"settings.gradle.kts",
		"gradlew",
	],
};

export function detectStacks(cwd, { existsSync }) {
	return Object.entries(STACK_MANIFESTS)
		.filter(([, manifests]) => manifests.some((m) => existsSync(join(cwd, m))))
		.map(([stack]) => stack);
}

// Universal hooks (no `stack`) always pass; stack-specific hooks only survive
// when their stack overlaps with `stacks`. Empty/missing `stacks` is a no-op —
// same rule as the site's catalogue filter (src/lib/hooks.ts).
export function filterHooksByStack(hooks, stacks) {
	if (!stacks || stacks.length === 0) return hooks;
	return hooks.filter(
		(h) => !h.stack?.length || h.stack.some((s) => stacks.includes(s)),
	);
}

// ── contextual signal detection ───────────────────────────────────────────────
// Complementary to stack detection: stacks (typescript/python/java) decide which
// default hooks apply; signals (i18n, OKF, Next.js…) decide which non-default
// hooks to ADD for the systems the project actually uses. Signals are cheap
// filesystem probes run against the current project; each maps to catalogue
// hooks that only make sense when that system is present. `--no-detect` opts
// out of both layers.

// package.json dependency names that indicate an i18n/translation system.
const I18N_PACKAGE_NAMES = new Set([
	"i18next",
	"react-i18next",
	"next-intl",
	"vue-i18n",
	"react-intl",
	"@formatjs/intl",
	"@lingui/core",
	"@lingui/react",
	"@lingui/macro",
	"typesafe-i18n",
	"i18n-js",
	"rosetta",
	"ttag",
	"fbt",
]);

// package.json dependency names that indicate a front-end codebase.
const FRONTEND_PACKAGE_NAMES = new Set([
	"react",
	"react-dom",
	"vue",
	"svelte",
	"astro",
	"preact",
	"solid-js",
	"@angular/core",
	"@angular/platform-browser",
]);

// Directories never walked during signal detection (heavy or vendored).
const DETECT_SKIP_DIRS = new Set([
	"node_modules",
	".git",
	".next",
	".nuxt",
	".sveltekit",
	".turbo",
	"dist",
	"build",
	"out",
	".cache",
	"coverage",
	".venv",
	"venv",
	".claude",
	".codex",
	".idea",
	".vscode",
	"vendor",
	"Pods",
	"target",
]);

// Directory names that mark a translation store. Covers the de facto web
// conventions (locales/messages/i18n/translations/lang/l10n) plus the
// ecosystem standards: GNU gettext (po, LC_MESSAGES) and Apple (*.lproj).
// Android `values*` and Qt `translations/*.ts` are handled by the file probe
// (strings.xml / .ts under an i18n dir) — a bare `values/` dir is not a
// translation store by itself.
const I18N_DIR_RE =
	/^(?:locales?|messages?|translations?|langs?|l10n|i18n|po|LC_MESSAGES|.*\.lproj)$/i;
// Translation file names/extensions that are unambiguous regardless of
// location: gettext (.po/.pot), Project Fluent (.ftl), Flutter ARB (.arb),
// Apple (.strings), Android (strings.xml) and Java resource bundles
// (messages*.properties, case-insensitive — covers MessagesBundle*).
const I18N_EXT_RE = /\.(?:po|pot|ftl|arb|strings)$/i;
const I18N_FILE_RE = /^(?:strings\.xml|messages.*\.properties)$/i;
const OKF_DIR_RE = /^\.?okf$/i;
const NEXT_CONFIG_RE = /^next\.config\.(?:[cm]?js|ts)$/;
const TEST_DIR_RE = /^(?:tests?|__tests__|spec)$/i;

// package.json dependency names that indicate a JS/TS test runner (so
// `file-changed-run-tests` has something to run).
const TEST_RUNNER_PACKAGES = new Set([
	"vitest",
	"jest",
	"mocha",
	"@playwright/test",
	"playwright",
	"ava",
	"uvu",
	"tap",
	"jasmine",
]);

// Python manifests probed for a `pytest` mention.
const PYTEST_MANIFESTS = [
	"pyproject.toml",
	"requirements.txt",
	"requirements-dev.txt",
	"setup.py",
	"setup.cfg",
	"Pipfile",
	"tox.ini",
];

// TTS binaries: macOS always ships `say`; Linux needs espeak or spd-say.
const TTS_BINARIES = ["espeak", "spd-say"];
// Dotenv files probed for a Slack webhook (the hook no-ops without it).
const SLACK_ENV_FILES = [".env", ".env.local", ".env.development"];

// Human-readable label shown to the user when a signal is detected.
export const SIGNAL_LABELS = {
	i18n: "an i18n/translation system",
	okf: "an OKF knowledge bundle",
	nextjs: "a Next.js app",
	frontend: "a front-end codebase",
	github: "a GitHub-hosted repo",
	tests: "a test suite",
	skills: "Claude Code skills or commands",
	registry: "a hook registry",
	tts: "a system TTS voice",
	slack: "a Slack webhook",
	docs: "a multi-surface docs setup",
};

// Signal → catalogue slugs. A hook can unlock several signals; keep the table
// flat and one-directional so adding a new signal is a two-line change.
// nextjs also carries the SEO guards that only make sense on Next.js App Router
// (src/app/** metadata, next/image, robots/sitemap) — they are NOT default_on
// so a Vite/Express TypeScript project never gets Next.js-only hooks.
export const AUTO_DETECT = {
	i18n: ["stop-i18n-validation"],
	okf: [
		"okf-validate-on-change",
		"session-start-okf-staleness",
		"stop-okf-staleness-check",
	],
	nextjs: [
		"post-write-nextjs-quality",
		"seo-page-metadata-guard",
		"seo-next-image-guard",
		"stop-seo-structure-check",
	],
	frontend: ["post-edit-visual-check"],
	github: ["session-start-github-context"],
	tests: ["file-changed-run-tests"],
	skills: ["user-prompt-expansion-skill-context"],
	registry: [
		"registry-validate-on-change",
		"registry-changed-auto-sync",
		"stop-registry-drift-check",
	],
	tts: [
		"notification-tts-voice",
		"stop-tts-completion",
		"subagent-start-tts-announce",
		"subagent-stop-tts-summary",
	],
	slack: ["notification-slack"],
	docs: ["file-changed-docs-consistency"],
};

// Reads the union of all dependency flavors from package.json (or empty).
function readPackageDeps(root, { readFileSync }) {
	try {
		const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
		return new Set([
			...Object.keys(pkg.dependencies ?? {}),
			...Object.keys(pkg.devDependencies ?? {}),
			...Object.keys(pkg.peerDependencies ?? {}),
			...Object.keys(pkg.optionalDependencies ?? {}),
		]);
	} catch {
		return new Set();
	}
}

const hasAnyDep = (deps, names) => [...deps].some((name) => names.has(name));

// Depth-limited walk looking for an i18n directory (locales/locale/messages/
// i18n/translations/po/l10n/*.lproj…) or a translation file (.po/.ftl/.arb/
// .strings/strings.xml…), short-circuiting on the first match. Skips
// heavy/vendored dirs.
function hasI18nDir(dir, depth, readdirSync) {
	if (depth > 5) return false;
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return false;
	}
	for (const ent of entries) {
		if (DETECT_SKIP_DIRS.has(ent.name)) continue;
		if (ent.isDirectory()) {
			if (I18N_DIR_RE.test(ent.name)) return true;
			if (hasI18nDir(join(dir, ent.name), depth + 1, readdirSync)) return true;
		} else if (ent.isFile()) {
			if (I18N_EXT_RE.test(ent.name) || I18N_FILE_RE.test(ent.name)) return true;
		}
	}
	return false;
}

// True when the project root holds an OKF bundle dir (okf, OKF, .okf, .OKF…).
function hasOkfDir(root, readdirSync) {
	try {
		return readdirSync(root, { withFileTypes: true }).some(
			(ent) => ent.isDirectory() && OKF_DIR_RE.test(ent.name),
		);
	} catch {
		return false;
	}
}

// True when the root holds a next.config.{js,mjs,cjs,ts} file.
function hasNextConfig(root, readdirSync) {
	try {
		return readdirSync(root, { withFileTypes: true }).some(
			(ent) => ent.isFile() && NEXT_CONFIG_RE.test(ent.name),
		);
	} catch {
		return false;
	}
}

// True when the project is hosted on GitHub: a .github/ dir, or a git remote
// pointing at github.com (plain .git/config or worktree gitdir file).
function hasGithubSignal(root, { readdirSync, readFileSync }) {
	try {
		const entries = readdirSync(root, { withFileTypes: true });
		if (entries.some((e) => e.isDirectory() && e.name === ".github"))
			return true;
		const git = entries.find((e) => e.name === ".git");
		if (!git) return false;
		const gitPath = join(root, ".git");
		let config;
		if (git.isDirectory()) {
			config = readFileSync(join(gitPath, "config"), "utf8");
		} else {
			// Worktree: .git is a file containing "gitdir: <path>"
			const gitdir = readFileSync(gitPath, "utf8")
				.trim()
				.replace(/^gitdir:\s*/, "");
			config = readFileSync(join(root, gitdir, "config"), "utf8");
		}
		return /github\.com/.test(config);
	} catch {
		return false;
	}
}

// True when the project has a test suite the `file-changed-run-tests` hook can
// drive: a tests/test/__tests__/spec dir at the root, a JS/TS test runner in
// package.json, or a pytest mention in a Python manifest.
function hasTestsSignal(root, { readdirSync, readFileSync }) {
	try {
		if (
			readdirSync(root, { withFileTypes: true }).some(
				(ent) => ent.isDirectory() && TEST_DIR_RE.test(ent.name),
			)
		)
			return true;
	} catch {
		// unreadable root — fall through to manifest probes
	}
	const deps = readPackageDeps(root, { readFileSync });
	if (hasAnyDep(deps, TEST_RUNNER_PACKAGES)) return true;
	for (const file of PYTEST_MANIFESTS) {
		try {
			if (/pytest/.test(readFileSync(join(root, file), "utf8"))) return true;
		} catch {
			// missing manifest — try the next
		}
	}
	return false;
}

// True when the project defines Claude Code skills or slash commands
// (`.claude/skills/` or `.claude/commands/`).
function hasSkillsSignal(root, existsSync) {
	return [".claude/skills", ".claude/commands"].some((dir) =>
		existsSync(join(root, dir)),
	);
}

// True for a HookStack-style catalogue repo: `registry/registry.json` plus the
// `.claude/sync-hooks.mjs` the registry hooks shell out to (avoids installing
// `registry-validate-on-change` in a repo that has no validation script).
function hasRegistrySignal(root, existsSync) {
	return (
		existsSync(join(root, "registry", "registry.json")) &&
		existsSync(join(root, ".claude", "sync-hooks.mjs"))
	);
}

// True when the machine can speak the agent's notifications out loud: macOS
// always ships `say`; Linux needs espeak or spd-say on PATH.
function hasTtsSignal({ platform, env, existsSync }) {
	if (platform === "darwin") return true;
	if (platform !== "linux") return false;
	const path = env.PATH ?? env.Path ?? "";
	if (!path) return false;
	const sep = path.includes(";") ? ";" : ":";
	return path
		.split(sep)
		.some((dir) =>
			TTS_BINARIES.some((bin) => dir && existsSync(join(dir, bin))),
		);
}

// True when a Slack webhook is configured (env var or dotenv file) — the hook
// no-ops without one, so detection targets only setups where it will work.
function hasSlackSignal(root, { env, readFileSync }) {
	if (env.SLACK_WEBHOOK_URL) return true;
	for (const file of SLACK_ENV_FILES) {
		try {
			if (/SLACK_WEBHOOK_URL\s*=/.test(readFileSync(join(root, file), "utf8")))
				return true;
		} catch {
			// missing dotenv — try the next
		}
	}
	return false;
}

// True for a monorepo with several product-surface READMEs (root + at least one
// packages/*/README.md) that must stay consistent.
function hasDocsSignal(root, { readdirSync }) {
	let rootReadme = false;
	try {
		rootReadme = readdirSync(root, { withFileTypes: true }).some(
			(ent) => ent.isFile() && ent.name === "README.md",
		);
	} catch {
		return false;
	}
	if (!rootReadme) return false;
	try {
		const pkgs = readdirSync(join(root, "packages"), { withFileTypes: true });
		for (const pkg of pkgs) {
			if (!pkg.isDirectory()) continue;
			if (
				readdirSync(join(root, "packages", pkg.name), {
					withFileTypes: true,
				}).some((ent) => ent.isFile() && ent.name === "README.md")
			)
				return true;
		}
	} catch {
		return false;
	}
	return false;
}

// Detects which contextual systems the current project has, so `install` can
// suggest the hooks that only make sense there. Pure: all filesystem, env and
// platform access goes through the injected deps (mirrors findInstalledSlugs'
// DI contract). New optional deps default to "absent" so callers that only
// probe filesystem structure keep working unchanged.
export function detectProjectSignals(
	root,
	{ readdirSync, readFileSync, existsSync = () => false, env = {}, platform = "" } = {},
) {
	const signals = new Set();
	const deps = readPackageDeps(root, { readFileSync });
	if (hasI18nDir(root, 0, readdirSync) || hasAnyDep(deps, I18N_PACKAGE_NAMES)) {
		signals.add("i18n");
	}
	if (hasOkfDir(root, readdirSync)) signals.add("okf");
	if (deps.has("next") || hasNextConfig(root, readdirSync))
		signals.add("nextjs");
	if (hasAnyDep(deps, FRONTEND_PACKAGE_NAMES)) signals.add("frontend");
	if (hasGithubSignal(root, { readdirSync, readFileSync }))
		signals.add("github");
	if (hasTestsSignal(root, { readdirSync, readFileSync }))
		signals.add("tests");
	if (hasSkillsSignal(root, existsSync)) signals.add("skills");
	if (hasRegistrySignal(root, existsSync)) signals.add("registry");
	if (hasTtsSignal({ platform, env, existsSync })) signals.add("tts");
	if (hasSlackSignal(root, { env, readFileSync })) signals.add("slack");
	if (hasDocsSignal(root, { readdirSync })) signals.add("docs");
	return [...signals].sort();
}

// Maps detected signals to catalogue slugs, minus the ones the user already
// selected or has installed. Slugs that don't exist in the catalogue are simply
// dropped by the API fetch — no need to hard-fail here.
export function suggestHooksForSignals(signals, selectedSlugs = []) {
	const slugs = [];
	for (const signal of signals) {
		for (const slug of AUTO_DETECT[signal] ?? []) {
			if (selectedSlugs.includes(slug) || slugs.includes(slug)) continue;
			slugs.push(slug);
		}
	}
	return slugs;
}

// Merges incoming settings.json hook fragments into existing ones, grouping by
// event then by matcher (no overwrite, no duplicate commands). Same contract as
// src/lib/mergeConfig. Running install twice yields the same result as once.
export function mergeHooks(existing, incoming) {
	const merged = structuredClone(existing);
	for (const [event, entries] of Object.entries(incoming)) {
		merged[event] ??= [];
		for (const entry of entries) {
			const found = merged[event].find(
				(e) => (e.matcher ?? "") === (entry.matcher ?? ""),
			);
			if (found) {
				const seen = new Set(found.hooks.map((h) => h.command));
				for (const h of entry.hooks) {
					if (!seen.has(h.command)) {
						found.hooks.push(h);
						seen.add(h.command);
					}
				}
			} else merged[event].push({ ...entry, hooks: [...entry.hooks] });
		}
	}
	return merged;
}

// Whether a hook should install its Python variant (python_script_path) instead
// of the .mjs. Only when the hook carries one AND the install targets a pure
// Python toolchain (mixed TS+Python repos keep the .mjs, node being present
// there).
function usePythonVariant(hook, python) {
	return Boolean(
		python && hook.python_script_path && hook.python_code_snippet,
	);
}

// Rewrites a hook command for its Python variant:
//   node $CLAUDE_PROJECT_DIR/.claude/hooks/foo.mjs
//   → python3 $CLAUDE_PROJECT_DIR/.claude/hooks/foo.py
// The python_script_path basename wins so the on-disk file always matches.
function toPythonCommand(command, pythonScriptPath) {
	const base = basename(pythonScriptPath);
	return command
		.replace(/^node\s+/, "python3 ")
		.replace(/\.claude\/hooks\/[^\s"]+\.mjs/, `.claude/hooks/${base}`);
}

// Rewrites a hook command's path for the target scope:
// - global             → $CLAUDE_PROJECT_DIR ↦ absolute global root (.claude stays)
// - copilot            → strips $CLAUDE_PROJECT_DIR/ (relative, Copilot compatible)
// - codex-project      → "$CLAUDE_PROJECT_DIR/.claude/" ↦ ".codex/" (relative)
// - codex-profile      → "$CLAUDE_PROJECT_DIR/.claude/" ↦ "<home>/.codex/" (absolute)
function rewriteCommand(command, scope, globalRoot) {
	if (scope === "global" && globalRoot)
		return command.replace(PROJECT_DIR_RE, globalRoot);
	if (scope === "copilot")
		return command.replace(/\$\{?CLAUDE_PROJECT_DIR\}?\//g, "");
	if (scope === "codex-project")
		return command.replace(CLAUDE_PREFIX_RE, ".codex/");
	if (scope === "codex-profile" && globalRoot)
		return command.replace(CLAUDE_PREFIX_RE, `${globalRoot}/.codex/`);
	return command;
}

// Gathers the hook fragments from an API hook list into a single event→entries
// map, rewriting command paths per scope (see rewriteCommand). The resulting map
// is identical in shape for both Claude (settings.hooks) and Codex (top-level
// hooks.json) — only doInstall decides how to nest it on disk.
export function collectIncomingHooks(
	hooks,
	{ scope = "project", globalRoot, python = false } = {},
) {
	const incoming = {};
	for (const hook of hooks) {
		const fragment = hook.config?.hooks;
		if (!fragment) continue;
		const pyVariant = usePythonVariant(hook, python);
		for (const [event, entries] of Object.entries(fragment)) {
			incoming[event] ??= [];
			for (const entry of entries) {
				incoming[event].push({
					...entry,
					hooks: entry.hooks.map((h) => {
						if (!h.command || typeof h.command !== "string") return h;
						const command = pyVariant
							? toPythonCommand(h.command, hook.python_script_path)
							: h.command;
						return {
							...h,
							command: rewriteCommand(command, scope, globalRoot),
						};
					}),
				});
			}
		}
	}
	return incoming;
}

// Maps a hook's script_path to its on-disk destination for the target scope.
// Codex installs relocate scripts from .claude/hooks/ to .codex/hooks/.
export function resolveScriptPath(scriptPath, scope) {
	if (isCodexScope(scope)) return scriptPath.replace(/^\.claude\//, ".codex/");
	return scriptPath;
}

export function isBlockingEvent(event) {
	return BLOCKING_EVENTS.has(event);
}

// Honest static read of what a hook's code does — no external service.
// Recognizes both the Node (.mjs) and Python (.py) variants.
export function analyzeSecurity(codeSnippet) {
	const code = codeSnippet ?? "";
	const has = (...patterns) => patterns.some((re) => re.test(code));
	return {
		shell: has(
			/\b(execSync|execFileSync|execFile|exec|spawnSync|spawn|fork)\s*\(/,
			/child_process/,
			/\bsubprocess\b/,
			/\bos\.(system|popen)\b/,
		),
		network: has(
			/\bfetch\s*\(/,
			/['"]node:(https?|net|dgram|dns)['"]/,
			/\brequire\(\s*['"](https?|net|dgram|dns)['"]\s*\)/,
			/\bfrom\s+['"](node:)?https?['"]/,
			/\b(urllib|requests|http\.client|socket|httpx)\b/,
		),
		fsWrite: has(
			/\b(writeFileSync|writeFile|appendFileSync|appendFile|rmSync|unlinkSync|unlink|mkdirSync|renameSync|rename|rmdirSync|cpSync)\s*\(/,
			/\bopen\([^)]*['"]w/, // open(…, "w") — Python
			/\bPath\([^)]*\).*(write_text|write_bytes|unlink|rmdir)/,
			/\b(os\.(remove|unlink|mkdir|rename)|shutil\.(copy|move|rmtree))\b/,
		),
	};
}

// Maps a stored Snyk scan ({high, medium, low}) to a short verdict label.
// Returns the "unknown" placeholder when no scan data is available yet.
export function snykVerdict(snyk) {
	if (!snyk || typeof snyk !== "object")
		return { label: "—", level: "unknown" };
	const { high = 0, medium = 0, low = 0 } = snyk;
	if (high > 0) return { label: "High Risk", level: "high" };
	if (medium > 0) return { label: "Med Risk", level: "medium" };
	if (low > 0) return { label: "Low Risk", level: "low" };
	return { label: "Safe", level: "safe" };
}

// Maps a stored CodeQL scan to a short verdict label.
export function codeqlVerdict(codeql) {
	if (!codeql || typeof codeql !== "object")
		return { label: "—", level: "unknown" };
	const { critical = 0, high = 0, medium = 0, low = 0 } = codeql;
	if (critical > 0 || high > 0) return { label: "High Risk", level: "high" };
	if (medium > 0) return { label: "Med Risk", level: "medium" };
	if (low > 0) return { label: "Low Risk", level: "low" };
	return { label: "Safe", level: "safe" };
}

export function shortRepo(url) {
	if (!url) return null;
	return String(url)
		.replace(/^https?:\/\/github\.com\//, "")
		.replace(/\.git$/, "")
		.replace(/\/$/, "");
}

// Writes test files for installed hooks into <projectRoot>/tests/hooks/.
// Only hooks that have a matching snippet are written; others are silently
// skipped. Python projects (python=true) receive pytest tests
// (tests/hooks/test_<slug>.py) for hooks with a Python variant — vitest tests
// are never installed there, so the project's CI stays Python-only.
export function doInstallTests(
	hooks,
	projectRoot,
	{ mkdirSync, writeFileSync, join },
	{ python = false } = {},
) {
	const testsDir = join(projectRoot, "tests", "hooks");
	mkdirSync(testsDir, { recursive: true });
	let testCount = 0;
	for (const hook of hooks) {
		if (python) {
			if (!hook.python_test_snippet) continue;
			const dest = join(testsDir, `test_${hook.slug}.py`);
			writeFileSync(dest, hook.python_test_snippet, "utf8");
			testCount++;
			continue;
		}
		if (!hook.test_snippet) continue;
		const dest = join(testsDir, `${hook.slug}.test.mjs`);
		writeFileSync(dest, hook.test_snippet, "utf8");
		testCount++;
	}
	return { testCount };
}

// ── update ────────────────────────────────────────────────────────────────────
// `update` re-fetches each already-installed hook from the live registry and
// refreshes its .mjs in place — same overwrite as install, just without the
// user having to remember which slugs they picked originally.

// Matches the "// @hookstack <slug>" (or "# @hookstack <slug>" on Python
// variants) fingerprint sync-hooks.mjs writes on line 2 of every script (see
// CLAUDE.md "Conventions hooks Claude Code").
const FINGERPRINT_RE = /^(?:\/\/|#)\s*@hookstack\s+(\S+)/;

export function extractFingerprint(content) {
	const line2 = (content ?? "").split("\n")[1] ?? "";
	return FINGERPRINT_RE.exec(line2)?.[1] ?? null;
}

// Scans a hooks directory for previously installed HookStack scripts, reading
// each script's fingerprint (line 2) to recover its slug alongside the ACTUAL
// filename that carries it. Both .mjs and .py variants are recognized. The
// on-disk file may have been renamed by the user (e.g. `post-write-biome.mjs`
// → `biome-check.mjs`) — the fingerprint is the source of truth, not the
// filename. Used by `update` (slugs) and `contribute` (slug + file, so the
// copy reads the file wherever it actually lives).
export function scanInstalledHooks(hooksDir, { readdirSync, readFileSync }) {
	let files;
	try {
		files = readdirSync(hooksDir);
	} catch {
		return [];
	}
	const found = new Map();
	for (const file of files) {
		if (!file.endsWith(".mjs") && !file.endsWith(".py")) continue;
		let content;
		try {
			content = readFileSync(join(hooksDir, file), "utf8");
		} catch {
			continue;
		}
		const slug = extractFingerprint(content);
		if (!slug) continue;
		// Dédup par slug. Si le fichier canonique <slug>.mjs existe en plus d'un
		// fichier renommé, le canonique gagne — c'est celui qui porte l'identité
		// attendue par le registre.
		const existing = found.get(slug);
		const canonical = `${slug}.mjs`;
		if (!existing || (file === canonical && existing.file !== canonical)) {
			found.set(slug, { slug, file });
		}
	}
	return [...found.values()];
}

// Slugs only — enough for `update`, which re-fetches by slug. `contribute`
// prefers scanInstalledHooks to keep the actual file path.
export function findInstalledSlugs(hooksDir, deps) {
	return scanInstalledHooks(hooksDir, deps).map(({ slug }) => slug);
}

// Splits freshly fetched hooks into those whose on-disk script differs from
// the registry (will be overwritten) and those already up to date.
// `fileBySlug` lets callers (contribute) point at the ACTUAL file a slug lives
// in when the user renamed it — read that path instead of script_path.
export function detectScriptChanges(
	hooks,
	scope,
	root,
	{ readFileSync, fileBySlug = {}, python = false } = {},
) {
	const changed = [];
	const unchanged = [];
	for (const hook of hooks) {
		// Python installs compare the installed .py against python_code_snippet;
		// otherwise the .mjs against code_snippet (fileBySlug lets contribute
		// point at the ACTUAL file when the user renamed it).
		const usePy = usePythonVariant(hook, python);
		const scriptPath = usePy ? hook.python_script_path : hook.script_path;
		const snippet = usePy ? hook.python_code_snippet : hook.code_snippet;
		if (!scriptPath || !snippet) continue;
		const dest = usePy
			? join(root, resolveScriptPath(scriptPath, scope))
			: (fileBySlug[hook.slug] ??
				join(root, resolveScriptPath(scriptPath, scope)));
		let existing = null;
		try {
			existing = readFileSync(dest, "utf8");
		} catch {
			// No file on disk yet — treat as changed so update can (re)write it.
		}
		(existing === snippet ? unchanged : changed).push(hook.slug);
	}
	return { changed, unchanged };
}

// Refreshes existing test files for updated hooks. Unlike doInstallTests this
// never creates a new test file — only hooks the user already opted into
// testing (file present from a prior --with-tests install) get refreshed.
// Python installs refresh pytest files for hooks with a Python variant; the
// .mjs tests are never touched there (CI stays Python-only).
export function doUpdateTests(
	hooks,
	projectRoot,
	{ existsSync, writeFileSync, join },
	{ python = false } = {},
) {
	const testsDir = join(projectRoot, "tests", "hooks");
	let testCount = 0;
	for (const hook of hooks) {
		if (python) {
			if (!hook.python_test_snippet) continue;
			const dest = join(testsDir, `test_${hook.slug}.py`);
			if (!existsSync(dest)) continue;
			writeFileSync(dest, hook.python_test_snippet, "utf8");
			testCount++;
			continue;
		}
		if (!hook.test_snippet) continue;
		const dest = join(testsDir, `${hook.slug}.test.mjs`);
		if (!existsSync(dest)) continue;
		writeFileSync(dest, hook.test_snippet, "utf8");
		testCount++;
	}
	return { testCount };
}

// ── contribute ───────────────────────────────────────────────────────────────
// `contribute` finds locally edited hooks (diverged from the live registry —
// same comparison as `update`, just framed the other way round) and opens a
// PR upstream from a fork. The git/gh plumbing lives in cli.mjs; only the
// branch name, PR copy, and fork/owner decision are pure enough to unit-test
// here.

// `gh repo fork` errors out when the authenticated user already owns the
// upstream repo (GitHub won't let you fork your own repo). When that's the
// case, contribute as a normal branch + PR against the upstream repo itself
// instead of forking.
export function resolveContributionTarget(username, upstreamRepo) {
	const [owner, name] = upstreamRepo.split("/");
	const isOwner = username.toLowerCase() === owner.toLowerCase();
	return {
		isOwner,
		cloneRepo: isOwner ? upstreamRepo : `${username}/${name}`,
	};
}

export function buildContributionBranch(slugs) {
	return `hookstack-contrib/${slugs.join("-")}`;
}

// `withTests` lists the test file paths (repo-relative, e.g.
// "tests/hooks/detect-secrets.test.mjs") included in the PR.
export function buildContributionPr(slugs, { withTests = [] } = {}) {
	const title =
		slugs.length === 1
			? `Update hook: ${slugs[0]}`
			: `Update hooks: ${slugs.join(", ")}`;
	const body = [
		"Local changes to the following hook(s), submitted via `npx hookstack-cli@latest contribute`:",
		"",
		...slugs.map((s) => `- \`${s}\``),
	];
	if (withTests.length > 0) {
		body.push(
			"",
			"Unit tests updated:",
			"",
			...withTests.map((p) => `- \`${p}\``),
		);
	}
	return { title, body: body.join("\n") };
}

// Candidate test paths for a hook under `<dir>/tests/hooks/`, slug-based first
// then script-basename-based — the upstream repo names ~half its tests after
// the script file (e.g. detect-secrets.test.mjs for slug
// pre-bash-secret-detection). Mirrors the lookup in .claude/sync-hooks.mjs.
// `hook.file` (the ACTUAL installed file, which the user may have renamed — see
// scanInstalledHooks) is also considered, so a renamed test file is detected
// just like the renamed script it belongs to.
function testPathCandidates(hook, dir) {
	const alts = new Set(
		[
			hook.script_path ? basename(hook.script_path, ".mjs") : null,
			hook.file ? basename(hook.file, ".mjs") : null,
		]
			.filter(Boolean)
			.filter((b) => b !== hook.slug),
	);
	const candidates = [join(dir, "tests", "hooks", `${hook.slug}.test.mjs`)];
	for (const base of alts) {
		candidates.push(join(dir, "tests", "hooks", `${base}.test.mjs`));
	}
	return candidates;
}

// Resolves where a hook's unit test lives in `dir`: the first candidate that
// already exists (slug- or basename-named), else the slug-based path (the
// naming the CLI uses when installing tests with --with-tests).
export function resolveTestDest(hook, dir, { existsSync }) {
	const candidates = testPathCandidates(hook, dir);
	return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

// Compares local unit test files under tests/hooks/ against the registry's
// test_snippet for each hook, returning the slugs whose local test differs
// from the published one (edited locally, or written for a hook that ships no
// test at all). Mirrors detectScriptChanges for the .mjs scripts: a difference
// means the user's version is a candidate to contribute upstream.
export function detectTestChanges(hooks, projectRoot, { readFileSync }) {
	const changed = [];
	for (const hook of hooks) {
		let existing = null;
		for (const dest of testPathCandidates(hook, projectRoot)) {
			try {
				existing = readFileSync(dest, "utf8");
				break;
			} catch {
				// Try the next candidate (basename-named test).
			}
		}
		if (existing === null) continue;
		if (existing !== (hook.test_snippet ?? "")) changed.push(hook.slug);
	}
	return changed;
}

// Display rows for the "Installation Summary" panel.
export function buildSummaryRows(hooks, { root, python = false }) {
	return hooks.map((h) => {
		const events = h.config?.hooks ? Object.keys(h.config.hooks) : [];
		const scriptPath =
			python && h.python_script_path ? h.python_script_path : h.script_path;
		return {
			slug: h.slug,
			name: h.name ?? h.slug,
			path: scriptPath ? join(root, scriptPath) : null,
			category: h.category ?? null,
			events,
			blocking: events.some(isBlockingEvent),
			matcher: h.trigger ?? null,
			source: shortRepo(h.community_examples?.[0]?.repo),
		};
	});
}

// Maps hook slugs to post-install hints about required external tools.
// Keep as a plain object so it's trivially testable without any async/fetch.
export const PREREQ_HINTS = {
	"stop-duplication-check":
		"Requires jscpd:  pnpm add -D jscpd  (pnpm workspace? add -w · or npm install -g jscpd)",
	"notification-sound":
		"Optional: brew install terminal-notifier  (enables click-to-focus — opens your terminal or Claude app when notification fires)",
	"post-write-biome":
		"Requires Biome:  pnpm add -D @biomejs/biome  (pnpm workspace? add -w · or npm install -D @biomejs/biome)",
	"post-write-java-format":
		"Requires google-java-format on PATH:  brew install google-java-format  (or download the jar from github.com/google/google-java-format)",
};

// Returns one hint entry per installed hook that has an external prerequisite.
export function buildPostInstallHints(hooks) {
	return hooks.flatMap((h) => {
		const hint = PREREQ_HINTS[h.slug];
		return hint ? [{ slug: h.slug, hint }] : [];
	});
}

// Display rows for the "Installation Summary" panel: description + static capabilities + verdicts.
export function buildSecurityRows(hooks) {
	return hooks.map((h) => ({
		slug: h.slug,
		name: h.name ?? h.slug,
		benefit: h.benefit ?? null,
		...analyzeSecurity(h.code_snippet),
		snyk: snykVerdict(h.security?.snyk),
		codeql: codeqlVerdict(h.security?.codeql),
	}));
}
