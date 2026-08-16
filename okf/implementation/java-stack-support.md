---
type: Playbook
title: Support de la stack Java — hooks spécialisés + détection CLI
description: La stack `java` rejoint `typescript`/`python` : 4 hooks spécialisés (format google-java-format, compile, tests, enforce wrapper), détection par manifeste (pom.xml/build.gradle/gradlew) et filtrage par défaut côté CLI.
tags: [implementation, cli, registry, stack, java]
timestamp: 2026-08-16T00:00:00Z
---

# Support de la stack Java — hooks spécialisés + détection CLI

## Problème

Le catalogue avait des stacks spécialisées pour TypeScript/Node (biome, tsc,
vitest, pnpm) et Python (ruff, pyright, pytest, uv), mais rien pour Java : un
projet `pom.xml`/`build.gradle` ne recevait que les hooks universels, sans
pipeline qualité (format/compile/tests) ni garde sur l'invocation du build.
L'élargissement de l'enum `stack` à Java était déjà listé « hors scope » dans
[cli-stack-detection.md](cli-stack-detection.md).

## Résolution

1. **Enum `java`** partout où `Stack` est un type fermé :
   - `src/types/hook.ts` (`Stack`, `STACK_LABELS`, `STACK_COLORS`)
   - `src/components/HookRow.tsx` + `CatalogueExplorer.tsx` (monogramme « Ja »,
     orange — la couleur Java conventionnelle)
   - `registry/registry.schema.json` (enum du champ `stack`)
2. **Détection CLI** : `STACK_MANIFESTS.java` dans `packages/cli/bin/core.mjs`
   (`pom.xml`, `build.gradle`, `build.gradle.kts`, `settings.gradle(.kts)`,
   `gradlew`) ; `--stack=java` accepté dans `parseArgs` et `resolveStacks` ;
   message « toolchain inconnue » élargi à Java.
3. **4 hooks spécialisés** (`stack: ["java"]`, `default_on: true`) :
   - `post-write-java-format` — `google-java-format -i` (PostToolUse Write|Edit).
   - `post-edit-java-compile` — `mvn -q compile` ou `./gradlew -q compileJava`
     (PostToolUse Write|Edit).
   - `stop-java-test` — `mvn -q test` ou `./gradlew -q test` (Stop, exit 2 en
     échec, court-circuit si aucun `.java`/config de build modifié).
   - `pre-bash-enforce-java-build` — bloque `gradle`/`mvn` nus quand le wrapper
     (`gradlew`/`mvnw`) existe, pour épingler la version du toolchain.
4. **Helper partagé** `.claude/hooks/lib/java-build.mjs` (`detectBuildTool`) :
   wrapper Gradle d'abord, puis Gradle nu, puis Maven ; gère `gradlew.bat` sur
   Windows (`platform` injectée). Le sync le miroite en `companion_files`.

## Décisions clés

- **Pas de variante `.py`** : un hook Java s'exécute via `node` (le runtime
  garanti par Claude Code) et orchestre `mvn`/`gradle`/`google-java-format`.
  La variante `.py` reste réservée aux projets Python où le CI doit rester
  Python-only.
- **Compile/test = tâche de build, pas `javac` fichier-à-fichier** : compiler
  un seul `.java` sans classpath échoue sur les imports. On lance la tâche du
  build tool (analogue de `tsc --noEmit`), comme `post-edit-typecheck`.
- **Enforce = wrapper, pas « un seul build tool »** : Maven et Gradle sont tous
  deux légitimes, contrairement à uv/pnpm qui sont LE outil de leur stack. On
  impose donc le wrapper (épingle la version), pas un outil unique — et ça
  n'entre jamais en conflit avec les hooks Node/Python dans un monorepo mixte.
- **Exclusion du dogfood automatique** : `EXCLUDED_STACKS` de sync-hooks.mjs
  contenait déjà `java` — les 4 hooks sont synced dans le registre mais pas
  injectés dans `.claude/settings.json` local (ce repo n'est pas un projet Java).

## À retenir

- Ajouter une stack = 6 surfaces à toucher : type TS, 2 composants (monogramme),
  schéma registre, `STACK_MANIFESTS`, `parseArgs`/`resolveStacks`, messages CLI.
- Un hook `stack: ["java"]` n'a **pas** de variante Python : le contrat
  « variante `.py` » est propre à la stack Python, pas un droit commun.
