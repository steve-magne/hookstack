#!/usr/bin/env node
// @hookstack seo-schema-validation
// Validates JSON-LD schema.org blocks after editing an HTML-like file (PostToolUse Write|Edit).
// Adapted from https://github.com/AgriciDaniel/claude-seo (hooks/validate-schema.py).
// Blocking (exit code 2) when a block ships placeholder text or deprecated/retired
// schema.org types; a non-blocking warning otherwise. Silent when no markup is present.
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

// <script type="application/ld+json">…</script>, attributes order-insensitive-ish (type first).
const LD_JSON_RE =
	/<script\s+type=["']application\/ld\+json["']\s*>(.*?)<\/script>/gis;

const VALID_EXTENSIONS = [
	".html",
	".htm",
	".jsx",
	".tsx",
	".vue",
	".svelte",
	".php",
	".ejs",
];

// Files above this size are typically generated/minified bundles — skip them to
// bound memory and hook latency.
const MAX_FILE_BYTES = 10 * 1024 * 1024;

// Placeholder text that must never reach production (Google rejects it and
// competitors index it).
const PLACEHOLDERS = [
	"[Business Name]",
	"[City]",
	"[State]",
	"[Phone]",
	"[Address]",
	"[Your",
	"[INSERT",
	"REPLACE",
	"[URL]",
	"[Email]",
];

// Types Google no longer accepts for rich results. Retired types also stop
// being valid Schema.org vocabulary.
const DEPRECATED_TYPES = {
	HowTo: "deprecated September 2023",
	SpecialAnnouncement: "deprecated July 31, 2025",
	CourseInfo: "retired June 2025",
	EstimatedSalary: "retired June 2025",
	LearningVideo: "retired June 2025",
	ClaimReview: "retired June 2025; fact-check rich results discontinued",
	VehicleListing:
		"retired June 2025; vehicle listing structured data discontinued",
};

function defaultGetSize(filePath) {
	return statSync(filePath).size;
}

export function run(
	input,
	{ readFile = readFileSync, getSize = defaultGetSize } = {},
) {
	const filePath = input.tool_input?.file_path ?? "";
	if (!VALID_EXTENSIONS.some((ext) => filePath.toLowerCase().endsWith(ext))) {
		return null;
	}

	let size;
	try {
		size = getSize(filePath);
	} catch {
		return null; // file missing/unreadable → nothing to validate
	}
	if (size > MAX_FILE_BYTES) return null;

	let content;
	try {
		content = readFile(filePath, "utf8");
	} catch {
		return null;
	}

	const errors = validateBlocks(content);
	if (!errors.length) return null;

	const critical = errors.filter((e) =>
		/placeholder|deprecated|retired/i.test(e),
	);
	const warnings = errors.filter((e) => !critical.includes(e));

	const lines = [];
	if (warnings.length) {
		lines.push("⚠️  Schema validation warnings:");
		lines.push(...warnings.map((w) => `  - ${w}`));
	}
	if (critical.length) {
		lines.push("🛑 Schema validation ERRORS (blocking):");
		lines.push(...critical.map((e) => `  - ${e}`));
	}
	const message = `[schema] ${filePath}\n${lines.join("\n")}\n`;

	return critical.length ? { exitCode: 2, message } : { message };
}

function validateBlocks(content) {
	const errors = [];
	let blockNum = 0;
	for (const match of content.matchAll(LD_JSON_RE)) {
		blockNum++;
		const raw = match[1].trim();
		let data;
		try {
			data = JSON.parse(raw);
		} catch (e) {
			errors.push(`Block ${blockNum}: invalid JSON; ${e.message}`);
			continue;
		}
		const objects = Array.isArray(data) ? data : [data];
		for (const obj of objects) validateObject(obj, blockNum, errors);
	}
	return errors;
}

function validateObject(obj, blockNum, errors) {
	if (typeof obj !== "object" || obj === null) {
		errors.push(`Block ${blockNum}: expected a JSON object`);
		return;
	}
	const prefix = `Block ${blockNum}`;

	if (!Object.hasOwn(obj, "@context")) {
		errors.push(`${prefix}: missing @context`);
	} else if (
		obj["@context"] !== "https://schema.org" &&
		obj["@context"] !== "http://schema.org"
	) {
		errors.push(`${prefix}: @context should be 'https://schema.org'`);
	}

	if (!Object.hasOwn(obj, "@type")) {
		errors.push(`${prefix}: missing @type`);
	}

	const text = JSON.stringify(obj);
	for (const placeholder of PLACEHOLDERS) {
		if (text.toLowerCase().includes(placeholder.toLowerCase())) {
			errors.push(`${prefix}: contains placeholder text: ${placeholder}`);
		}
	}

	const types = Array.isArray(obj["@type"]) ? obj["@type"] : [obj["@type"]];
	for (const type of types) {
		if (type && DEPRECATED_TYPES[type]) {
			errors.push(`${prefix}: @type '${type}' is ${DEPRECATED_TYPES[type]}`);
		}
	}
}

/* v8 ignore next 6 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	const result = run(input);
	if (result?.message) process.stderr.write(result.message);
	if (result?.exitCode) process.exit(result.exitCode);
}
