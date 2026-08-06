import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	test: {
		environment: "node",
		// Les worktrees de session (.claude/worktrees/*) sont des copies isolées :
		// leurs tests résoudraient l'alias '@' vers le src/ de ce checkout et
		// planteraient. On les exclut pour que `pnpm test` ne collecte que les
		// tests du checkout courant.
		exclude: [...configDefaults.exclude, "**/.claude/worktrees/**"],
		coverage: {
			provider: "v8",
			// json-summary est consommé par le hook stop-per-file-coverage
			// (coverage/coverage-summary.json) ; text sert au rapport CI lisible.
			reporter: ["text", "json-summary"],
			// Vitest 4 mesure les fichiers importés par les tests (dans include) ;
			// un fichier inclus mais jamais importé n'apparaît pas dans le rapport.
			// Surface réellement unit-testée : les composants React src/components/*
			// ne sont pas testés en environnement node — hors périmètre du gate. Les
			// scripts CI annexes (.claude/scan-snyk.mjs, .claude/sync-codeql.mjs)
			// sont volontairement hors gate : couverture partielle, hors surface produit.
			include: [
				"src/lib/**/*.{ts,tsx}",
				"src/store/**/*.ts",
				".claude/hooks/**/*.mjs",
				".claude/hooks-timeline.mjs",
				"packages/cli/bin/core.mjs",
			],
			exclude: [...(configDefaults.coverage.exclude ?? [])],
			thresholds: {
				lines: 80,
				statements: 80,
				branches: 80,
				// functions à 75 (et non 80) : chaque hook expose des fabriques de
				// dépendances par défaut (defaultExec…) que les tests remplacent
				// volontairement par des fakes — la couverture fonctions agrégée des
				// hooks plafonne structurellement à ~76 %.
				functions: 75,
			},
		},
	},
});
