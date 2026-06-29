#!/usr/bin/env node
// Syncs GitHub Code Scanning (CodeQL) alert counts into registry.json.
// Reads open CodeQL alerts via the GitHub API, groups by file path + severity,
// and writes per-hook counts into implementation.security.codeql.
//
//   node .claude/sync-codeql.mjs            # sync + write registry.json
//   node .claude/sync-codeql.mjs --dry-run  # sync + print, no write
//
// Requires GITHUB_TOKEN (read:security_events) in the environment.
// Runs our side so `npx hookstack-cli` stays token-free for end users.
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

const REGISTRY_PATH = new URL("../registry/registry.json", import.meta.url);
const REPO = process.env.GITHUB_REPOSITORY ?? "steve-magne/hookstack";
const TOKEN = process.env.GITHUB_TOKEN;

// Fetches all open CodeQL alerts for the repo, paginated.
// Pure: injected fetch for testability.
export async function fetchCodeqlAlerts(
	repo,
	token,
	{ fetch: _fetch = fetch } = {},
) {
	const alerts = [];
	let page = 1;
	while (true) {
		const url = `https://api.github.com/repos/${repo}/code-scanning/alerts?tool_name=CodeQL&state=open&per_page=100&page=${page}`;
		const res = await _fetch(url, {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/vnd.github+json",
				"X-GitHub-Api-Version": "2022-11-28",
			},
		});
		if (res.status === 404) {
			console.warn(
				"! Code Scanning not enabled on this repo or no alerts found.",
			);
			return [];
		}
		if (!res.ok) {
			const body = await res.text().catch(() => "");
			throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
		}
		const page_alerts = await res.json();
		if (!page_alerts.length) break;
		alerts.push(...page_alerts);
		if (page_alerts.length < 100) break;
		page++;
	}
	return alerts;
}

// Maps CodeQL severity level strings to our bucket keys.
const LEVEL_MAP = {
	critical: "critical",
	high: "high",
	medium: "medium",
	low: "low",
	// fallback for non-security rules
	error: "high",
	warning: "medium",
	note: "low",
	recommendation: "low",
};

// Aggregates alert list into { '<basename>.mjs': { critical, high, medium, low } }.
// Pure: no I/O, unit-testable.
export function aggregateAlerts(alerts) {
	const counts = {};
	const bump = (file, bucket) => {
		counts[file] ??= { critical: 0, high: 0, medium: 0, low: 0 };
		if (bucket in counts[file]) counts[file][bucket]++;
	};
	for (const alert of alerts) {
		const path = alert.most_recent_instance?.location?.path;
		if (!path) continue;
		const file = basename(path);
		const level =
			LEVEL_MAP[alert.rule?.security_severity_level] ??
			LEVEL_MAP[alert.rule?.severity] ??
			"low";
		bump(file, level);
	}
	return counts;
}

// Writes codeql counts back into registry hooks. Every hook with a script_path
// gets a record — zero findings → { critical:0, high:0, medium:0, low:0 }.
export function attachVerdicts(hooks, fileCounts, scannedAt) {
	const updated = [];
	for (const hook of hooks) {
		const scriptPath = hook.implementation?.script_path;
		if (!scriptPath) continue;
		const file = basename(scriptPath);
		const found = fileCounts[file] ?? {
			critical: 0,
			high: 0,
			medium: 0,
			low: 0,
		};
		hook.implementation.security ??= {};
		hook.implementation.security.codeql = { ...found, scannedAt };
		updated.push(hook.slug);
	}
	return updated;
}

async function main(argv) {
	const dryRun = argv.includes("--dry-run");

	if (!TOKEN) {
		console.error("✗ GITHUB_TOKEN is required. Set it in your environment.");
		process.exit(1);
	}

	const raw = readFileSync(REGISTRY_PATH, "utf8");
	const data = JSON.parse(raw);
	const hooks = Array.isArray(data) ? data : data.hooks;

	console.log(`Fetching CodeQL alerts for ${REPO}…`);
	const alerts = await fetchCodeqlAlerts(REPO, TOKEN);
	console.log(
		`  ${alerts.length} open CodeQL alert${alerts.length === 1 ? "" : "s"} found.`,
	);

	const fileCounts = aggregateAlerts(alerts);
	const scannedAt = new Date().toISOString();
	const updated = attachVerdicts(hooks, fileCounts, scannedAt);

	const flagged = Object.entries(fileCounts).filter(
		([, c]) => c.critical || c.high || c.medium || c.low,
	);
	console.log(
		`✓ ${updated.length} hooks updated — ${flagged.length} with findings.`,
	);
	for (const [file, c] of flagged) {
		console.log(
			`   ${file}: ${c.critical} critical · ${c.high} high · ${c.medium} medium · ${c.low} low`,
		);
	}

	if (dryRun) {
		console.log("\n(dry-run) registry.json not written.");
		return;
	}
	writeFileSync(REGISTRY_PATH, `${JSON.stringify(data, null, 2)}\n`);
	console.log("✓ registry.json updated.");
}

/* v8 ignore next 3 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main(process.argv.slice(2)).catch((e) => {
		console.error(`✗ ${e.message}`);
		process.exit(1);
	});
}
