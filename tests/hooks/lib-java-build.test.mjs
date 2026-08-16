// @vitest-environment node
import { describe, expect, it } from "vitest";
import { detectBuildTool } from "../../.claude/hooks/lib/java-build.mjs";

const CWD = "/repo";

function fsWith(...present) {
	return (p) => present.some((name) => p.endsWith(name));
}

describe("detectBuildTool", () => {
	it("préfère le wrapper Gradle s'il existe", () => {
		expect(
			detectBuildTool({
				exists: fsWith("gradlew"),
				projectDir: CWD,
				platform: "linux",
			}),
		).toEqual({ tool: "gradle", cmd: "./gradlew" });
	});

	it("utilise gradlew.bat sur Windows", () => {
		expect(
			detectBuildTool({
				exists: fsWith("gradlew.bat"),
				projectDir: CWD,
				platform: "win32",
			}),
		).toEqual({ tool: "gradle", cmd: "gradlew.bat" });
	});

	it("retombe sur gradle nu si build.gradle sans wrapper", () => {
		expect(
			detectBuildTool({
				exists: fsWith("build.gradle.kts"),
				projectDir: CWD,
				platform: "linux",
			}),
		).toEqual({ tool: "gradle", cmd: "gradle" });
	});

	it("détecte Maven via pom.xml", () => {
		expect(
			detectBuildTool({
				exists: fsWith("pom.xml"),
				projectDir: CWD,
				platform: "linux",
			}),
		).toEqual({ tool: "maven", cmd: "mvn" });
	});

	it("retourne null sans outil de build Java", () => {
		expect(
			detectBuildTool({
				exists: fsWith("package.json", "go.mod"),
				projectDir: CWD,
				platform: "linux",
			}),
		).toBeNull();
	});
});
