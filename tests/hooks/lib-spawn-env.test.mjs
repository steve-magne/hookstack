// @vitest-environment node
import { describe, expect, it } from "vitest";
import { hookSpawnEnv } from "../../.claude/hooks/lib/spawn-env.mjs";

describe("hookSpawnEnv", () => {
	it("pose NPM_CONFIG_CACHE dans <projectDir>/.npm-cache-tmp", () => {
		const env = hookSpawnEnv("/repo");
		expect(env.NPM_CONFIG_CACHE).toBe("/repo/.npm-cache-tmp");
	});

	it("neutralise la réinstallation implicite de pnpm (verify-deps-before-run)", () => {
		const env = hookSpawnEnv("/repo");
		expect(env.PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN).toBe("false");
	});

	it("préserve l'environnement courant (PATH…)", () => {
		const env = hookSpawnEnv("/repo");
		expect(env.PATH).toBe(process.env.PATH);
	});

	it("ne mute pas process.env", () => {
		const before = process.env.NPM_CONFIG_CACHE;
		hookSpawnEnv("/repo");
		expect(process.env.NPM_CONFIG_CACHE).toBe(before);
	});
});
