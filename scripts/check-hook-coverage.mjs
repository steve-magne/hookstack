#!/usr/bin/env node
// Gate CI per-hook : en plus du seuil agrégé de vitest (pnpm test:coverage), chaque
// hook individuel (.claude/hooks/*.mjs) doit avoir ≥ 80 % de couverture lignes.
//
// Lit coverage/coverage-summary.json (reporter json-summary de vitest, généré par
// `pnpm test:coverage`). Les hooks hérités sous le seuil vivent dans EXCEPTIONS —
// mais une exception « périmée » (hook remonté ≥ 80 %, ou fichier disparu) fait
// échouer le check pour forcer son retrait : la liste ne doit que décroître.
// Un hook absent du résumé (aucun test ne l'importe) échoue toujours, même
// excepté : une exception couvre un hook sous-seuil *testé*, pas un hook sans test.
//
// Pattern run() + DI — voir tests/lib/check-hook-coverage.test.mjs.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const LINE_THRESHOLD = 80;

// Hooks hérités sous le seuil de couverture lignes, listés par basename de fichier.
// Chaque exception doit être retirée dès que le hook repasse ≥ LINE_THRESHOLD.
export const EXCEPTIONS = [
	"load-git-context.mjs",
	"notification-sound.mjs",
	"okf-staleness-check.mjs",
	"pre-webfetch-html-to-markdown.mjs",
	"pytest.mjs",
	"reload-direnv.mjs",
	"run-tests.mjs",
	"session-start-github-context.mjs",
	"session-start-pull-if-main.mjs",
	"session-start-worktree-if-main.mjs",
	"setup-worktree-env.mjs",
	"stop-registry-drift-check.mjs",
	"stop-tts.mjs",
	"subagent-start-tts.mjs",
	"subagent-stop-tts.mjs",
];

function summaryEntry(summary, hooksDir, file) {
	const suffix = join(hooksDir, file);
	for (const [key, entry] of Object.entries(summary)) {
		if (key.endsWith(suffix)) return entry;
	}
	return null;
}

export function run({
	readDir = readdirSync,
	readFile = readFileSync,
	exists = existsSync,
	hooksDir = ".claude/hooks",
	summaryPath = "./coverage/coverage-summary.json",
	threshold = LINE_THRESHOLD,
	exceptions = EXCEPTIONS,
} = {}) {
	if (!exists(summaryPath)) {
		return {
			exitCode: 1,
			message: `[check-hook-coverage] ${summaryPath} introuvable — lancer \`pnpm test:coverage\` d'abord.`,
		};
	}

	let summary;
	try {
		summary = JSON.parse(readFile(summaryPath, "utf8"));
	} catch {
		return {
			exitCode: 1,
			message:
				"[check-hook-coverage] coverage-summary.json illisible (JSON invalide).",
		};
	}

	let hooks;
	try {
		hooks = readDir(hooksDir).filter((f) => f.endsWith(".mjs"));
	} catch {
		return {
			exitCode: 1,
			message: `[check-hook-coverage] ${hooksDir}/ introuvable ou illisible.`,
		};
	}

	const below = []; // hooks sous le seuil, non exceptés → gate
	const missing = []; // hooks absents du résumé → non testés, gate même exceptés
	const stale = []; // exceptions dont le hook est repassé ≥ seuil → retrait forcé
	const orphan = []; // exceptions dont le fichier a disparu → retrait forcé

	for (const file of hooks) {
		// Vitest 4 ne rapporte que les fichiers importés par les tests : un hook
		// absent du résumé n'est couvert nulle part → 0 %. Une exception couvre un
		// hook sous-seuil *testé*, jamais un hook sans test.
		const entry = summaryEntry(summary, hooksDir, file);
		const excepted = exceptions.includes(file);
		if (!entry) {
			missing.push({ file, pct: 0 });
			continue;
		}
		const pct = entry.lines?.pct ?? 0;
		if (pct < threshold && !excepted) below.push({ file, pct });
		if (pct >= threshold && excepted) stale.push({ file, pct });
	}
	for (const file of exceptions) {
		if (!hooks.includes(file)) orphan.push(file);
	}

	const problems = [];
	if (below.length > 0) {
		problems.push(
			`[FAIL] ${below.length} hook(s) sous ${threshold}% de couverture lignes :\n${below
				.map(({ file, pct }) => `  - ${file}: ${pct.toFixed(1)}%`)
				.join(
					"\n",
				)}\n→ Compléter tests/hooks/<slug>.test.mjs pour atteindre le seuil.`,
		);
	}
	if (missing.length > 0) {
		problems.push(
			`[FAIL] ${missing.length} hook(s) absent(s) du résumé de coverage (aucun test ne les importe) :\n${missing
				.map(({ file }) => `  - ${file}: 0.0%`)
				.join(
					"\n",
				)}\n→ Écrire un test tests/hooks/<slug>.test.mjs qui importe et exécute le hook.`,
		);
	}
	if (stale.length > 0) {
		problems.push(
			`[FAIL] ${stale.length} exception(s) périmée(s) — couverture désormais ≥ ${threshold}%, les retirer de EXCEPTIONS dans scripts/check-hook-coverage.mjs :\n${stale
				.map(({ file, pct }) => `  - ${file}: ${pct.toFixed(1)}%`)
				.join("\n")}`,
		);
	}
	if (orphan.length > 0) {
		problems.push(
			`[FAIL] ${orphan.length} exception(s) obsolète(s) — fichier absent de ${hooksDir}/ :\n${orphan
				.map((f) => `  - ${f}`)
				.join("\n")}\n→ Les retirer de EXCEPTIONS.`,
		);
	}

	if (problems.length > 0) {
		return { exitCode: 1, message: problems.join("\n\n") };
	}
	return {
		exitCode: 0,
		message: `[OK] ${hooks.length} hooks — couverture lignes ≥ ${threshold}% sur chacun (${exceptions.length} exception(s) consentie(s)).`,
	};
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const result = run();
	process.stdout.write(`${result.message}\n`);
	process.exit(result.exitCode);
}
