#!/usr/bin/env node
// @hookstack stop-i18n-validation
// Valide la cohérence des fichiers de traduction (Stop)
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Répertoires exclus du parcours : lourds et sans traduction.
// `.claude` contient les worktrees (copies complètes du repo) — principal coupable du timeout.
const SKIP_DIRS = new Set([
	"node_modules",
	".git",
	".claude",
	".next",
	".turbo",
	".sveltekit",
	"dist",
	"build",
	".cache",
	"coverage",
	".worktrees",
]);

// Un fichier est i18n s'il vit sous un dossier locales/messages/i18n.
const I18N_PATH = /(?:^|[\\/])(?:locales?|messages?|i18n)[\\/]/i;

// Parcours natif (pas de spawn de shell) : rapide même sur un gros monorepo.
export function findI18nJson(projectDir) {
	const out = [];
	const walk = (dir) => {
		let ents;
		try {
			ents = readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const ent of ents) {
			if (ent.isDirectory()) {
				if (SKIP_DIRS.has(ent.name)) continue;
				walk(join(dir, ent.name));
			} else if (ent.isFile() && ent.name.endsWith(".json")) {
				const rel = relative(projectDir, join(dir, ent.name))
					.split(sep)
					.join("/");
				if (I18N_PATH.test(rel)) out.push(`./${rel}`);
			}
		}
	};
	walk(projectDir);
	return out;
}

export function run({
	exec,
	readFile = readFileSync,
	projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
} = {}) {
	// `exec` n'est utilisé que par les tests (mock) ; en production, parcours natif
	// (plus de spawn shell, donc plus de risque d'ETIMEDOUT sur un gros monorepo).
	// Ponytail: try/catch conservé — un mock qui throw ne doit pas crasher un Stop
	// hook non bloquant ; on rend la main silencieusement.
	let i18nFiles;
	try {
		i18nFiles = exec
			? exec('find . -name "*.json" -print')
					.split("\n")
					.filter((f) => I18N_PATH.test(f) && f.endsWith(".json"))
			: findI18nJson(projectDir);
	} catch {
		return null;
	}

	if (i18nFiles.length < 2) return null;

	// Groupe par répertoire et vérifie la cohérence des clés
	const byDir = {};
	for (const f of i18nFiles) {
		const dir = f.split("/").slice(0, -1).join("/");
		byDir[dir] ??= [];
		byDir[dir].push(f);
	}

	const issues = [];
	for (const [, files] of Object.entries(byDir)) {
		if (files.length < 2) continue;
		const parsed = files
			.map((f) => {
				try {
					return {
						f,
						keys: new Set(
							Object.keys(JSON.parse(readFile(join(projectDir, f), "utf8"))),
						),
					};
				} catch {
					return null;
				}
			})
			.filter(Boolean);

		const allKeys = new Set(parsed.flatMap((p) => [...p.keys]));
		for (const { f, keys } of parsed) {
			const missing = [...allKeys].filter((k) => !keys.has(k));
			if (missing.length > 0)
				issues.push(
					`${f} manque ${missing.length} clé(s) : ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}`,
				);
		}
	}

	const message =
		issues.length > 0
			? `[i18n-validation] Incohérences détectées :\n${issues.map((i) => `  - ${i}`).join("\n")}\n`
			: "[i18n-validation] ✓ Fichiers de traduction cohérents.\n";

	return { issues, message };
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const result = run();
	if (result) process.stderr.write(result.message);
}
