// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/enforce-java-build.mjs";

const bash = (command) => ({ tool_name: "Bash", tool_input: { command } });

function opts({ gradlew = false, mvnw = false } = {}) {
	return {
		exists: (p) =>
			(gradlew && p.endsWith("gradlew")) || (mvnw && p.endsWith("mvnw")),
		projectDir: "/repo",
	};
}

describe("enforce-java-build", () => {
	it("ignore les outils non-Bash", () => {
		expect(
			run(
				{ tool_name: "Write", tool_input: { command: "gradle build" } },
				opts({ gradlew: true }),
			),
		).toBeNull();
	});

	it("laisse passer ./gradlew", () => {
		expect(run(bash("./gradlew build"), opts({ gradlew: true }))).toBeNull();
	});

	it("laisse passer gradle nu si aucun wrapper présent", () => {
		expect(run(bash("gradle build"), opts({ gradlew: false }))).toBeNull();
	});

	it("bloque gradle nu quand gradlew existe", () => {
		const r = run(bash("gradle build"), opts({ gradlew: true }));
		expect(r?.decision).toBe("block");
		expect(r?.reason).toContain("./gradlew");
	});

	it("bloque mvn nu quand mvnw existe", () => {
		const r = run(bash("mvn test"), opts({ mvnw: true }));
		expect(r?.decision).toBe("block");
		expect(r?.reason).toContain("./mvnw");
	});

	it("ne bloque pas gradlew (contient gradle mais sans espace après)", () => {
		expect(run(bash("gradlew build"), opts({ gradlew: true }))).toBeNull();
	});

	it("bloque gradle enchaîné après &&", () => {
		const r = run(bash("cd app && gradle build"), opts({ gradlew: true }));
		expect(r?.decision).toBe("block");
	});

	it("ignore une mention de gradle entre guillemets", () => {
		expect(
			run(bash('git commit -m "upgrade gradle build"'), opts({ gradlew: true })),
		).toBeNull();
	});

	it("ne bloque pas une commande contenant gradle dans un nom de fichier", () => {
		expect(run(bash("cat gradle-notes.md"), opts({ gradlew: true }))).toBeNull();
	});
});
