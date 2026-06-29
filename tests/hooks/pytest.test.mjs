// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/pytest.mjs";

const CWD = "/fake/project";

function makeOpts({
	marker = "pyproject.toml",
	pytestStatus = 0,
	xdistInstalled = false,
	stdout = "",
	stderr = "",
} = {}) {
	const spawn = vi.fn((_cmd, args) => {
		// Premier appel : détection xdist
		if (args.includes("import xdist"))
			return { status: xdistInstalled ? 0 : 1, stdout: "", stderr: "" };
		// Deuxième appel : pytest
		return { status: pytestStatus, stdout, stderr };
	});
	return {
		cwd: CWD,
		changed: ["test_foo.py"],
		exists: (p) => (marker ? p.endsWith(marker) : false),
		spawn,
	};
}

describe("pytest", () => {
	it("retourne null si projet non-Python", () => {
		const opts = makeOpts({ marker: null });
		expect(run(opts)).toBeNull();
		expect(opts.spawn).not.toHaveBeenCalled();
	});

	it("lance pytest sans -n auto si xdist absent", () => {
		const opts = makeOpts({ marker: "pyproject.toml", xdistInstalled: false });
		run(opts);
		const pytestCall = opts.spawn.mock.calls.find(([, args]) =>
			args.includes("pytest"),
		);
		expect(pytestCall[1]).toEqual(["run", "pytest", "--tb=short", "-q"]);
	});

	it("lance pytest avec -n auto si xdist présent", () => {
		const opts = makeOpts({ marker: "pyproject.toml", xdistInstalled: true });
		run(opts);
		const pytestCall = opts.spawn.mock.calls.find(([, args]) =>
			args.includes("pytest"),
		);
		expect(pytestCall[1]).toEqual([
			"run",
			"pytest",
			"-n",
			"auto",
			"--tb=short",
			"-q",
		]);
	});

	it("détecte pytest.ini", () => {
		const opts = makeOpts({ marker: "pytest.ini" });
		const result = run(opts);
		expect(result).not.toBeNull();
		expect(opts.spawn).toHaveBeenCalled();
	});

	it("retourne status 0 et message succès", () => {
		const opts = makeOpts({ pytestStatus: 0, stdout: "5 passed in 0.3s" });
		const result = run(opts);
		expect(result.status).toBe(0);
		expect(result.message).toContain("✓ Tests passés");
	});

	it("retourne status non-0 et message échec", () => {
		const opts = makeOpts({ pytestStatus: 1, stderr: "FAILED test_foo.py" });
		const result = run(opts);
		expect(result.status).toBe(1);
		expect(result.message).toContain("ÉCHEC");
		expect(result.message).toContain("FAILED test_foo.py");
	});

	it("court-circuite (null, aucun spawn) si aucun .py modifié", () => {
		const opts = makeOpts();
		opts.changed = ["README.md", "src/app.ts"];
		expect(run(opts)).toBeNull();
		expect(opts.spawn).not.toHaveBeenCalled();
	});

	it("lance pytest si un pyproject.toml a changé sans .py", () => {
		const opts = makeOpts();
		opts.changed = ["pyproject.toml"];
		expect(run(opts)).not.toBeNull();
		expect(opts.spawn).toHaveBeenCalled();
	});

	it("lance pytest hors dépôt git (changed null)", () => {
		const opts = makeOpts();
		opts.changed = null;
		expect(run(opts)).not.toBeNull();
	});
});
