// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/java-test.mjs";

const CWD = "/fake/project";

function makeOpts({
	marker = "pom.xml",
	execOk = true,
	stdout = "BUILD SUCCESSFUL",
	stderr = "",
} = {}) {
	const exec = vi.fn(() => {
		if (execOk) return stdout;
		const e = new Error("test failed");
		e.status = 1;
		e.stdout = "";
		e.stderr = stderr;
		throw e;
	});
	return {
		cwd: CWD,
		changed: ["Main.java"],
		exists: (p) => (marker ? p.endsWith(marker) : false),
		exec,
		platform: "linux",
	};
}

describe("java-test", () => {
	it("retourne null si projet non-Java", () => {
		const opts = makeOpts({ marker: null });
		expect(run(opts)).toBeNull();
		expect(opts.exec).not.toHaveBeenCalled();
	});

	it("Maven → mvn -q test", () => {
		const opts = makeOpts({ marker: "pom.xml" });
		run(opts);
		expect(opts.exec).toHaveBeenCalledWith("mvn -q test");
	});

	it("Gradle wrapper → ./gradlew -q test", () => {
		const opts = makeOpts({ marker: "pom.xml" });
		opts.exists = (p) => p.endsWith("build.gradle") || p.endsWith("gradlew");
		run(opts);
		expect(opts.exec).toHaveBeenCalledWith("./gradlew -q test");
	});

	it("retourne null sans outil de build Java reconnu", () => {
		const opts = makeOpts({ marker: "go.mod" });
		expect(run(opts)).toBeNull();
		expect(opts.exec).not.toHaveBeenCalled();
	});

	it("retourne status 0 et message succès", () => {
		const opts = makeOpts({ stdout: "BUILD SUCCESSFUL\n3 tests run" });
		const result = run(opts);
		expect(result.status).toBe(0);
		expect(result.message).toContain("✓ Tests passés");
		expect(result.message).toContain("3 tests run");
	});

	it("retourne status non-0 et message échec", () => {
		const opts = makeOpts({
			execOk: false,
			stderr: "FAILED: com.example.FooTest",
		});
		const result = run(opts);
		expect(result.status).toBe(1);
		expect(result.message).toContain("ÉCHEC");
		expect(result.message).toContain("com.example.FooTest");
	});

	it("court-circuite (null) si aucun .java modifié", () => {
		const opts = makeOpts();
		opts.changed = ["README.md", "src/main.ts"];
		expect(run(opts)).toBeNull();
		expect(opts.exec).not.toHaveBeenCalled();
	});

	it("lance les tests si pom.xml a changé sans .java", () => {
		const opts = makeOpts();
		opts.changed = ["pom.xml"];
		expect(run(opts)).not.toBeNull();
		expect(opts.exec).toHaveBeenCalled();
	});

	it("lance les tests hors dépôt git (changed null)", () => {
		const opts = makeOpts();
		opts.changed = null;
		expect(run(opts)).not.toBeNull();
		expect(opts.exec).toHaveBeenCalled();
	});
});
