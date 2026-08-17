// @vitest-environment node
// End-to-end harness for the CLI's non-interactive flows (install / update /
// contribute). It serves the real registry.json through a local HTTP API in the
// exact shape the CLI consumes (`/api/hooks`), then spawns `packages/cli/bin/cli`
// in scratch git repos and asserts on the filesystem + exit code. No network, no
// real GitHub interaction: `contribute` is pointed at a fake `gh` that always
// fails, so the "graceful gh gate" is covered hermetically.
//
// The CLI is spawned ASYNCHRONOUSLY (child_process.spawn, not spawnSync): the
// registry server lives in THIS process, and a synchronous spawn would block its
// event loop while the child's fetch is in flight.

import { spawn, spawnSync } from "node:child_process";
import {
	chmodSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const CLI = join(ROOT, "packages/cli/bin/cli");
const REGISTRY = JSON.parse(
	readFileSync(join(ROOT, "registry/registry.json"), "utf8"),
);

// Mirrors src/app/api/hooks/route.ts — the exact shape the CLI fetches.
function mapHook(h) {
	return {
		slug: h.slug,
		name: h.name,
		benefit: h.benefit ?? null,
		category: h.category,
		hook_type: h.hook_type,
		trigger: h.trigger,
		stack: h.stack ?? [],
		config: h.implementation?.config?.hooks
			? { hooks: h.implementation.config.hooks }
			: null,
		script_path: h.implementation?.script_path ?? null,
		code_snippet: h.implementation?.code_snippet ?? null,
		test_snippet: h.implementation?.test_snippet ?? null,
		python_script_path: h.implementation?.python_script_path ?? null,
		python_code_snippet: h.implementation?.python_code_snippet ?? null,
		python_test_snippet: h.implementation?.python_test_snippet ?? null,
		security: h.implementation?.security ?? null,
		companion_files: h.implementation?.companion_files ?? [],
	};
}

function startRegistryServer() {
	const server = createServer((req, res) => {
		const url = new URL(req.url, "http://127.0.0.1");
		if (url.pathname !== "/api/hooks") {
			res.writeHead(404).end();
			return;
		}
		const slugs = (url.searchParams.get("slugs") ?? "")
			.split(",")
			.filter(Boolean);
		const source =
			slugs.length === 0
				? REGISTRY.filter((h) => h.default_on)
				: REGISTRY.filter((h) => slugs.includes(h.slug));
		res.writeHead(200, { "content-type": "application/json" });
		res.end(JSON.stringify({ hooks: source.map(mapHook) }));
	});
	return new Promise((resolvePromise) => {
		server.listen(0, "127.0.0.1", () =>
			resolvePromise({
				server,
				base: `http://127.0.0.1:${server.address().port}`,
			}),
		);
	});
}

let api;
const scratchDirs = [];

beforeAll(async () => {
	api = await startRegistryServer();
});
afterAll(() => {
	api?.server.close();
	for (const dir of scratchDirs) rmSync(dir, { recursive: true, force: true });
});

function git(cwd, ...args) {
	const r = spawnSync("git", args, { cwd, encoding: "utf8" });
	if (r.status !== 0)
		throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
	return r;
}

// Fresh git repo with optional files and an optional github.com remote.
function scratchRepo({ files = {}, github = false } = {}) {
	const dir = mkdtempSync(join(tmpdir(), "hookstack-e2e-"));
	scratchDirs.push(dir);
	git(dir, "init", "-q");
	git(dir, "config", "user.email", "e2e@example.com");
	git(dir, "config", "user.name", "e2e");
	if (github)
		git(dir, "remote", "add", "origin", "https://github.com/acme/repo.git");
	for (const [rel, content] of Object.entries(files)) {
		const p = join(dir, rel);
		mkdirSync(dirname(p), { recursive: true });
		writeFileSync(p, content, "utf8");
	}
	return dir;
}

// Fake `gh` that always fails — makes `contribute` stop at the auth gate
// deterministically instead of touching a real GitHub account.
function ghShim() {
	const dir = mkdtempSync(join(tmpdir(), "hookstack-gh-shim-"));
	scratchDirs.push(dir);
	const p = join(dir, "gh");
	writeFileSync(p, "#!/bin/sh\nexit 1\n", "utf8");
	chmodSync(p, 0o755);
	return dir;
}

// Spawns the CLI and resolves with { status, signal, stdout, stderr } when it
// exits. Killed (SIGKILL) after 60s if it hangs — status stays null.
function runCli(cwd, args, { shimDir } = {}) {
	return new Promise((resolvePromise) => {
		const env = { ...process.env, HOOKSTACK_API_BASE: api.base, CI: "1" };
		if (shimDir) env.PATH = `${shimDir}:${process.env.PATH}`;
		const child = spawn(process.execPath, [CLI, ...args], {
			cwd,
			env,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (d) => {
			stdout += d;
		});
		child.stderr.on("data", (d) => {
			stderr += d;
		});
		const timer = setTimeout(() => child.kill("SIGKILL"), 60_000);
		child.on("error", (err) => {
			clearTimeout(timer);
			resolvePromise({
				status: null,
				signal: null,
				stdout,
				stderr,
				error: err,
			});
		});
		child.on("close", (code, signal) => {
			clearTimeout(timer);
			resolvePromise({ status: code, signal, stdout, stderr, error: null });
		});
	});
}

const out = (r) => `${r.stdout ?? ""}${r.stderr ?? ""}`;
const tsRepo = () =>
	scratchRepo({
		files: {
			"package.json": JSON.stringify({ name: "e2e-ts" }),
			"tsconfig.json": "{}",
		},
	});

const timeout = 60_000;

describe("install (direct)", () => {
	it(
		"installe des hooks explicites : script, settings.json et companion file",
		async () => {
			const cwd = tsRepo();
			const r = await runCli(cwd, [
				"install",
				"--yes",
				"--hooks=stop-quality-check",
			]);
			expect(r.status).toBe(0);
			expect(
				existsSync(join(cwd, ".claude/hooks/stop-quality-check.mjs")),
			).toBe(true);
			expect(existsSync(join(cwd, ".claude/hooks/lib/changed-files.mjs"))).toBe(
				true,
			);
			const settings = readFileSync(join(cwd, ".claude/settings.json"), "utf8");
			expect(settings).toContain("stop-quality-check.mjs");
		},
		timeout,
	);

	it(
		"installe les tests unitaires avec --with-tests",
		async () => {
			const cwd = tsRepo();
			const r = await runCli(cwd, [
				"install",
				"--yes",
				"--hooks=stop-quality-check",
				"--with-tests",
			]);
			expect(r.status).toBe(0);
			expect(
				existsSync(join(cwd, "tests/hooks/stop-quality-check.test.mjs")),
			).toBe(true);
		},
		timeout,
	);

	it(
		"écrit un git pre-commit avec --pre-commit",
		async () => {
			const cwd = tsRepo();
			const r = await runCli(cwd, [
				"install",
				"--yes",
				"--hooks=stop-quality-check",
				"--pre-commit",
			]);
			expect(r.status).toBe(0);
			const preCommit = readFileSync(
				join(cwd, ".git/hooks/pre-commit"),
				"utf8",
			);
			expect(preCommit).toContain("# @hookstack pre-commit");
			expect(preCommit).toContain("run_gate");
			expect(preCommit).toContain("stop-quality-check.mjs");
		},
		timeout,
	);

	it(
		"écrit une GitHub Action avec --github-action (repo GitHub)",
		async () => {
			const cwd = scratchRepo({
				github: true,
				files: { "package.json": JSON.stringify({ name: "e2e-ts" }) },
			});
			const r = await runCli(cwd, [
				"install",
				"--yes",
				"--hooks=stop-quality-check",
				"--github-action",
			]);
			expect(r.status).toBe(0);
			const workflow = readFileSync(
				join(cwd, ".github/workflows/hookstack-gates.yml"),
				"utf8",
			);
			expect(workflow).toContain("# @hookstack github-action");
			expect(workflow).toContain('HOOKSTACK_FULL_CHECK: "1"');
			expect(workflow).toContain("stop-quality-check.mjs");
		},
		timeout,
	);

	it(
		"install par défaut : filtre la stack (pas de hook python sur un projet TS)",
		async () => {
			const cwd = tsRepo();
			const r = await runCli(cwd, ["install", "--yes"]);
			expect(r.status).toBe(0);
			expect(
				existsSync(join(cwd, ".claude/hooks/stop-quality-check.mjs")),
			).toBe(true);
			expect(existsSync(join(cwd, ".claude/hooks/run-tests.mjs"))).toBe(true);
			expect(existsSync(join(cwd, ".claude/hooks/pytest.mjs"))).toBe(false);
		},
		timeout,
	);
});

describe("update (direct)", () => {
	it(
		"ne trouve rien sans installation préalable",
		async () => {
			const cwd = tsRepo();
			const r = await runCli(cwd, ["update", "--yes"]);
			expect(r.status).toBe(1);
			expect(out(r)).toContain("No HookStack hooks found");
		},
		timeout,
	);

	it(
		"signale 'up to date' quand rien n'a changé",
		async () => {
			const cwd = tsRepo();
			expect(
				(await runCli(cwd, ["install", "--yes", "--hooks=stop-quality-check"]))
					.status,
			).toBe(0);
			const r = await runCli(cwd, ["update", "--yes"]);
			expect(r.status).toBe(0);
			expect(out(r)).toContain("up to date");
		},
		timeout,
	);

	it(
		"restaure un hook édité localement depuis le registre",
		async () => {
			const cwd = tsRepo();
			expect(
				(await runCli(cwd, ["install", "--yes", "--hooks=stop-quality-check"]))
					.status,
			).toBe(0);
			const hookFile = join(cwd, ".claude/hooks/stop-quality-check.mjs");
			writeFileSync(
				hookFile,
				`${readFileSync(hookFile, "utf8")}\n// local edit\n`,
			);
			const r = await runCli(cwd, ["update", "--yes"]);
			expect(r.status).toBe(0);
			const canonical = REGISTRY.find((h) => h.slug === "stop-quality-check")
				.implementation.code_snippet;
			expect(readFileSync(hookFile, "utf8")).toBe(canonical);
		},
		timeout,
	);
});

describe("contribute (direct)", () => {
	it(
		"échoue proprement sans hooks installés",
		async () => {
			const cwd = tsRepo();
			const r = await runCli(cwd, ["contribute", "--yes"]);
			expect(r.status).toBe(1);
			expect(out(r)).toContain("No HookStack hooks found");
		},
		timeout,
	);

	it(
		"signale 'nothing to contribute' quand les hooks sont à jour",
		async () => {
			const cwd = tsRepo();
			expect(
				(await runCli(cwd, ["install", "--yes", "--hooks=stop-quality-check"]))
					.status,
			).toBe(0);
			const r = await runCli(cwd, ["contribute", "--yes"], {
				shimDir: ghShim(),
			});
			expect(r.status).toBe(0);
			expect(out(r)).toContain("Nothing to contribute");
		},
		timeout,
	);

	it(
		"détecte une édition locale puis s'arrête proprement au gate gh",
		async () => {
			const cwd = tsRepo();
			expect(
				(await runCli(cwd, ["install", "--yes", "--hooks=stop-quality-check"]))
					.status,
			).toBe(0);
			const hookFile = join(cwd, ".claude/hooks/stop-quality-check.mjs");
			writeFileSync(
				hookFile,
				`${readFileSync(hookFile, "utf8")}\n// local edit\n`,
			);
			const r = await runCli(cwd, ["contribute", "--yes"], {
				shimDir: ghShim(),
			});
			expect(r.status).toBe(1);
			expect(out(r)).toContain("GitHub CLI (gh) is required");
		},
		timeout,
	);
});
