// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/file-changed-reload-env.mjs";

describe("file-changed-reload-env", () => {
	it("recharge les variables valides", () => {
		const append = vi.fn();
		const r = run(
			{ file_path: ".env", event: "change" },
			{
				readFile: () => "FOO=1\n# comment\nBAR=2",
				append,
				envFile: "/tmp/env",
			},
		);
		expect(r.count).toBe(2);
		expect(append).toHaveBeenCalledWith("/tmp/env", "export FOO=1\n");
	});
	it("ignore unlink", () => {
		expect(run({ event: "unlink" }, { envFile: "/tmp/env" })).toBeNull();
	});
	it("ignore sans CLAUDE_ENV_FILE", () => {
		expect(run({ file_path: ".env" }, { envFile: undefined })).toBeNull();
	});
});
