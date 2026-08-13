// Pure, dependency-free logic for the hookstack CLI.
// Everything here is side-effect free and unit-tested in isolation; the
// interactive I/O (clack/picocolors, fs, fetch) lives in cli.mjs. This mirrors
// the project's "pure run() + thin I/O guard" hook convention.
import { existsSync } from "node:fs";
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

// ── toolstack detection ───────────────────────────────────────────────────────
// The default HookStack is filtered by the project's language so a Python repo
// never gets hooks that shell out to npm/tsc/biome, and a TS repo never gets
// hooks that shell out to uv/ruff/pytest. Detection is manifest-only: it looks
// for well-known toolchain marker files and never reads file contents, so it
// stays cheap and side-effect free at install time.

// Marker files that reveal a Node/TypeScript toolchain.
export const TYPESCRIPT_MARKERS = ["package.json", "tsconfig.json"];

// Marker files that reveal a Python toolchain.
export const PYTHON_MARKERS = [
	"pyproject.toml",
	"requirements.txt",
	"setup.py",
	"setup.cfg",
	"Pipfile",
	"uv.lock",
	"poetry.lock",
];

// Detects which toolchains the project at `cwd` belongs to. Pure + DI: `exists`
// defaults to node:fs existsSync, but tests inject a fake map.
export function detectToolstack(cwd, { exists = existsSync } = {}) {
	const has = (file) => exists(join(cwd, file));
	return {
		typescript: TYPESCRIPT_MARKERS.some(has),
		python: PYTHON_MARKERS.some(has),
	};
}

// Human-readable label for the detection result, used in install messaging.
export function describeToolchain(detected) {
	const parts = [];
	if (detected.typescript) parts.push("TypeScript/Node");
	if (detected.python) parts.push("Python");
	return parts.length > 0 ? parts.join(" + ") : "no recognized toolchain";
}

// Maps the parsed --stack flag + detected toolchain to the stack list used by
// filterHooksByStack. `null` means "no filtering" (--stack=all).
export function resolveStacks(flag, detected) {
	if (flag === "all") return null;
	if (flag === "typescript") return ["typescript"];
	if (flag === "python") return ["python"];
	// auto — trust the detection: a mixed project gets both toolchains.
	return [
		...(detected.typescript ? ["typescript"] : []),
		...(detected.python ? ["python"] : []),
	];
}

// Filters hooks by their declared `stack`. Universal hooks (no stack) always
// pass — they are language-neutral by contract. Stack-specific hooks are kept
// only when their stack intersects the enabled ones. `stacks === null` disables
// the filter entirely (--stack=all); `stacks === []` (no toolchain detected)
// keeps only the universal set.
export function filterHooksByStack(hooks, stacks) {
	if (stacks === null) return { kept: hooks, skipped: [] };
	const kept = [];
	const skipped = [];
	for (const hook of hooks) {
		if (!hook.stack?.length || hook.stack.some((s) => stacks.includes(s))) {
			kept.push(hook);
		} else {
			skipped.push(hook);
		}
	}
	return { kept, skipped };
}

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
		if (arg.startsWith("--stack=") || arg.startsWith("--language=")) {
			const v = (arg.includes("--stack=") ? arg.slice("--stack=".length) : arg.slice("--language=".length)).toLowerCase();
			if (["auto", "typescript", "python", "all"].includes(v)) result.stack = v;
			continue;
		}
		if ((arg === "--stack" || arg === "--language") && args[i + 1]) {
			const v = args[++i].toLowerCase();
			if (["auto", "typescript", "python", "all"].includes(v)) result.stack = v;
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
// of the .mjs. Only when the hook carries one AND the active stacks are pure
// Python (mixed TS+Python repos keep the .mjs, node being present there).
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
// When `python` is set, hooks carrying a Python variant register `python3 … .py`
// commands instead of `node … .mjs`.
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
// each script's fingerprint (line 2) to recover its slug. Both .mjs and .py
// variants are recognized. Used by `update` so the user doesn't have to retype
// --hooks=<slugs> for a re-install.
export function findInstalledSlugs(hooksDir, { readdirSync, readFileSync }) {
	let files;
	try {
		files = readdirSync(hooksDir);
	} catch {
		return [];
	}
	const slugs = [];
	for (const file of files) {
		if (!file.endsWith(".mjs") && !file.endsWith(".py")) continue;
		let content;
		try {
			content = readFileSync(join(hooksDir, file), "utf8");
		} catch {
			continue;
		}
		const slug = extractFingerprint(content);
		if (slug) slugs.push(slug);
	}
	return slugs;
}

// Splits freshly fetched hooks into those whose on-disk script differs from
// the registry (will be overwritten) and those already up to date.
// With `python`, hooks that carry a Python variant are compared against their
// .py file; the rest fall back to the .mjs comparison.
export function detectScriptChanges(
	hooks,
	scope,
	root,
	{ readFileSync, python = false },
) {
	const changed = [];
	const unchanged = [];
	for (const hook of hooks) {
		const usePy = usePythonVariant(hook, python);
		const scriptPath = usePy ? hook.python_script_path : hook.script_path;
		const snippet = usePy ? hook.python_code_snippet : hook.code_snippet;
		if (!scriptPath || !snippet) continue;
		const target = resolveScriptPath(scriptPath, scope);
		const dest = join(root, target);
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

export function buildContributionPr(slugs) {
	const title =
		slugs.length === 1
			? `Update hook: ${slugs[0]}`
			: `Update hooks: ${slugs.join(", ")}`;
	const body = [
		"Local changes to the following hook(s), submitted via `npx hookstack-cli@latest contribute`:",
		"",
		...slugs.map((s) => `- \`${s}\``),
	].join("\n");
	return { title, body };
}

// Display rows for the "Installation Summary" panel.
export function buildSummaryRows(hooks, { root, python = false }) {
	return hooks.map((h) => {
		const events = h.config?.hooks ? Object.keys(h.config.hooks) : [];
		const scriptPath = python && h.python_script_path ? h.python_script_path : h.script_path;
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
