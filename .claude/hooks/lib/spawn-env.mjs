// @hookstack lib-spawn-env
// Helper partagé par les hooks qui spawnt un gestionnaire de paquets ou npx
// (run-tests, file-changed-run-tests, setup-install-deps,
// worktree-create-update-deps, task-completed-test-gate, stop-quality-check,
// typecheck, post-tool-batch-typecheck, post-write-biome, per-file-lint,
// a11y-jsx-guard…).
//
// Le bug qu'il corrige : `npx` (même `--no-install`, qui résout le binaire local)
// et tout `npm exec`/`npm test` écrivent dans `~/.npm` par défaut — ce qui échoue
// en EPERM quand le home n'est pas accessible en écriture (spawn sandboxé d'agent ;
// le message « Your cache folder contains root-owned files » de npm n'est que sa
// supposition générique devant un EPERM). Le gate meurt alors avant d'avoir lancé
// la moindre commande, et une session saine passe pour rouge.
//
// Second piège, même famille : depuis une sandbox, le store global de pnpm est
// souvent non inscriptible → pnpm bascule sur un store local `<cwd>/.pnpm-store`,
// divergent de celui enregistré dans `node_modules/.modules.yaml` → le check
// `verify-deps-before-run` déclenche un `pnpm install` IMPLICITE au moindre
// `pnpm test`, qui crashe à son tour (EPERM sur ses fichiers temporaires, ou
// ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY hors CI). Un hook n'a pas vocation
// à réinstaller des dépendances (c'est le job de setup-install-deps) : on coupe
// le check pour les spawns. NB : pnpm 11 lit ses réglages via `PNPM_CONFIG_*`
// (pas `npm_config_*`) — vérifié empiriquement.
//
// **Invariant** : tout hook qui spawn npm/npx/pnpm/yarn pose `env:
// hookSpawnEnv(projectDir)` au lieu de `process.env` brut. `.npm-cache-tmp/` est
// gitignoré ; le cache y est éphémère et recréable.
import { join } from "node:path";

/**
 * Env à passer aux processus lancés par un hook : relocalise le cache npm DANS
 * le repo et neutralise la réinstallation implicite de pnpm, par-dessus
 * l'environnement courant (PATH, HOME… préservés).
 */
export function hookSpawnEnv(projectDir) {
	return {
		...process.env,
		NPM_CONFIG_CACHE: join(projectDir, ".npm-cache-tmp"),
		PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: "false",
	};
}
