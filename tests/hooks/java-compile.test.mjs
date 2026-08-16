// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/java-compile.mjs";
import { makeExecFail } from "./_utils.mjs";

const CWD = "/repo";

const fsWith = (...present) => (p) => present.some((name) => p.endsWith(name));

describe("java-compile", () => {
	it("ignore les fichiers non-.java", () => {
		const exec = vi.fn();
		expect(
			run(
				{ tool_input: { file_path: "a.ts" } },
				{ exec, exists: fsWith("pom.xml"), projectDir: CWD, platform: "linux" },
			),
		).toBeNull();
		expect(exec).not.toHaveBeenCalled();
	});

	it("Maven → mvn -q compile", () => {
		const exec = vi.fn();
		run(
			{ tool_input: { file_path: "Main.java" } },
			{ exec, exists: fsWith("pom.xml"), projectDir: CWD, platform: "linux" },
		);
		expect(exec).toHaveBeenCalledWith("mvn -q compile");
	});

	it("Gradle wrapper → ./gradlew -q compileJava", () => {
		const exec = vi.fn();
		run(
			{ tool_input: { file_path: "Main.java" } },
			{ exec, exists: fsWith("gradlew"), projectDir: CWD, platform: "linux" },
		);
		expect(exec).toHaveBeenCalledWith("./gradlew -q compileJava");
	});

	it("retourne null sans outil de build Java reconnu", () => {
		const exec = vi.fn();
		expect(
			run(
				{ tool_input: { file_path: "Main.java" } },
				{ exec, exists: fsWith("go.mod"), projectDir: CWD, platform: "linux" },
			),
		).toBeNull();
		expect(exec).not.toHaveBeenCalled();
	});

	it("retourne null si la compilation réussit", () => {
		expect(
			run(
				{ tool_input: { file_path: "a.java" } },
				{
					exec: vi.fn(),
					exists: fsWith("pom.xml"),
					projectDir: CWD,
					platform: "linux",
				},
			),
		).toBeNull();
	});

	it("remonte les erreurs de compilation dans le message", () => {
		const result = run(
			{ tool_input: { file_path: "a.java" } },
			{
				exec: makeExecFail("[ERROR] cannot find symbol"),
				exists: fsWith("pom.xml"),
				projectDir: CWD,
				platform: "linux",
			},
		);
		expect(result?.message).toContain("[java-compile]");
		expect(result?.message).toContain("cannot find symbol");
	});

	it("retourne null si la compilation échoue sans stdout", () => {
		const exec = () => {
			throw new Error("mvn not found");
		};
		expect(
			run(
				{ tool_input: { file_path: "a.java" } },
				{ exec, exists: fsWith("pom.xml"), projectDir: CWD, platform: "linux" },
			),
		).toBeNull();
	});
});
