// @hookstack lib-java-build
// Helper partagé par les hooks Java (post-edit-java-compile, stop-java-test).
// Détecte l'outil de build du projet : wrapper Gradle (./gradlew) d'abord, puis
// Gradle (build.gradle), puis Maven (pom.xml). Retourne { tool, cmd } ou null
// si le projet n'a pas d'outil de build Java reconnu.
import { existsSync } from "node:fs";
import { join } from "node:path";

export function detectBuildTool({
	exists = existsSync,
	projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
	platform = process.platform,
} = {}) {
	const has = (f) => exists(join(projectDir, f));

	// Le wrapper Gradle épingle la version du toolchain — toujours préféré.
	if (has("gradlew") || has("gradlew.bat"))
		return { tool: "gradle", cmd: platform === "win32" ? "gradlew.bat" : "./gradlew" };
	if (has("build.gradle") || has("build.gradle.kts"))
		return { tool: "gradle", cmd: "gradle" };
	if (has("pom.xml")) return { tool: "maven", cmd: "mvn" };
	return null;
}
