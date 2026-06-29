// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/debug-statement-guard.mjs";
import { makeFsDeps } from "./_utils.mjs";

const edit = (file_path) => ({ tool_name: "Edit", tool_input: { file_path } });

describe("debug-statement-guard", () => {
	it("signale un console.log dans un .ts", () => {
		const r = run(
			edit("src/a.ts"),
			makeFsDeps("const x = 1;\nconsole.log(x);\n"),
		);
		expect(r?.message).toContain("console.log");
	});

	it("signale un debugger", () => {
		expect(
			run(edit("src/a.tsx"), makeFsDeps("debugger;\n"))?.message,
		).toContain("debugger");
	});

	it("signale un print( en Python", () => {
		expect(run(edit("mod.py"), makeFsDeps('print("hi")\n'))?.message).toContain(
			"print",
		);
	});

	it("signale dbg! en Rust", () => {
		expect(
			run(edit("lib.rs"), makeFsDeps("let y = dbg!(x);\n"))?.message,
		).toContain("dbg!");
	});

	it("laisse passer un fichier propre", () => {
		expect(
			run(edit("src/a.ts"), makeFsDeps("export const x = 1;\n")),
		).toBeNull();
	});

	it("ignore les fichiers de test", () => {
		expect(
			run(edit("src/a.test.ts"), makeFsDeps("console.log(1);\n")),
		).toBeNull();
	});

	it("ignore une extension non gérée", () => {
		expect(run(edit("notes.md"), makeFsDeps("console.log\n"))).toBeNull();
	});

	it("laisse passer si le fichier n'existe pas", () => {
		expect(
			run(edit("gone.ts"), makeFsDeps("console.log(1);", false)),
		).toBeNull();
	});
});
