#!/usr/bin/env node
// @hookstack post-write-biome
// Vérifie le fichier avec Biome après écriture (PostToolUse Write|Edit)
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function defaultExec(cmd) {
	return execSync(cmd, { stdio: "pipe", timeout: 15_000 });
}

// Biome est un devDependency déclaré de ce repo : si le binaire est absent alors que
// package.json le liste, c'est que le `pnpm install` détaché (lancé à la création du
// worktree, cf. update-deps.mjs) n'a pas fini — pas "ce projet n'a pas Biome". Distinguer
// les deux évite d'avaler en silence un fichier jamais vérifié.
export function biomeExpectedButMissing(
	projectDir,
	{ exists = existsSync, readFile = readFileSync } = {},
) {
	if (exists(join(projectDir, "node_modules/.bin/biome"))) return false;
	try {
		const pkg = JSON.parse(readFile(join(projectDir, "package.json"), "utf8"));
		return !!(
			pkg.devDependencies?.["@biomejs/biome"] ??
			pkg.dependencies?.["@biomejs/biome"]
		);
	} catch {
		return false;
	}
}

export function run(
	input,
	{
		exec = defaultExec,
		projectDir = process.env.CLAUDE_PROJECT_DIR,
		exists,
		readFile,
	} = {},
) {
	const filePath = input.tool_input?.file_path ?? "";
	if (!filePath || !/\.([cm]?[jt]sx?|jsonc?)$/.test(filePath)) return null;

	if (
		biomeExpectedButMissing(projectDir ?? dirname(filePath), {
			exists,
			readFile,
		})
	) {
		return {
			message: `⚠️ Biome indisponible (pnpm install pas encore terminé dans ce worktree) — ${filePath} n'a pas été vérifié. Relancer \`pnpm biome:fix\` avant de terminer.\n`,
		};
	}

	try {
		// `biome check` (et non `biome lint`), sans --error-on-warnings, pour matcher
		// le CI qui lance `pnpm biome` = `biome check .` — sinon ce hook post-edit est
		// plus strict que la CI elle-même et bloque sur des warnings normaux en cours
		// d'édition (import pas encore câblé, `any` provisoire). Les warnings restent
		// vérifiés en fin de session par per-file-lint.mjs (Stop).
		exec(`npx --no-install biome check "${filePath}"`);
		return null;
	} catch (err) {
		const output = err.stdout?.toString() ?? "";
		return output ? { message: `Biome: ${output.trim()}\n` } : null;
	}
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	const result = run(input);
	if (result?.message) process.stderr.write(result.message);
}
