// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/stop-failure-rate-limit-alert.mjs";

describe("stop-failure-rate-limit-alert", () => {
	it("retourne une séquence terminale", () => {
		expect(run().terminalSequence).toContain("rate limit");
	});
});
