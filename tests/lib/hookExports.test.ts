import { describe, expect, it } from "vitest";
import {
	collectScripts,
	generateInstallScript,
	mergeSettings,
	toPluginFiles,
	toSettingsJson,
} from "@/lib/hookExports";
import type { Hook } from "@/types/hook";

function makeHook(
	overrides: Partial<Hook> & { config: Record<string, unknown> },
): Hook {
	return {
		slug: "test-hook",
		name: "Test Hook",
		category: "security",
		hook_type: "PreToolUse",
		trigger: "Bash",
		description: "",
		use_cases: [],
		tags: [],
		implementation: {
			type: "settings_json",
			config: overrides.config,
		},
		...overrides,
	};
}

const hookA = makeHook({
	config: {
		hooks: {
			PreToolUse: [
				{
					matcher: "Bash",
					hooks: [{ type: "command", command: "node hook-a.mjs" }],
				},
			],
		},
	},
});

const hookB = makeHook({
	slug: "hook-b",
	config: {
		hooks: {
			PreToolUse: [
				{
					matcher: "Bash",
					hooks: [{ type: "command", command: "node hook-b.mjs" }],
				},
			],
		},
	},
});

const hookC = makeHook({
	slug: "hook-c",
	config: {
		hooks: {
			PostToolUse: [
				{
					matcher: "Write",
					hooks: [{ type: "command", command: "node hook-c.mjs" }],
				},
			],
		},
	},
});

describe("mergeSettings", () => {
	it("retourne hooks vide pour une liste vide", () => {
		expect(mergeSettings([])).toEqual({ hooks: {} });
	});

	it("retourne le fragment d'un seul hook", () => {
		const result = mergeSettings([hookA]);
		expect(result.hooks.PreToolUse).toHaveLength(1);
		expect(result.hooks.PreToolUse[0].hooks).toHaveLength(1);
	});

	it("fusionne deux hooks avec meme event et meme matcher", () => {
		const result = mergeSettings([hookA, hookB]);
		const bashEntry = result.hooks.PreToolUse.find((e) => e.matcher === "Bash");
		expect(bashEntry?.hooks).toHaveLength(2);
	});

	it("cree des entrees separees pour des matchers differents", () => {
		const result = mergeSettings([hookA, hookC]);
		expect(result.hooks.PreToolUse).toHaveLength(1);
		expect(result.hooks.PostToolUse).toHaveLength(1);
	});

	it("ignore les hooks sans fragment config.hooks", () => {
		const hookNoConfig = makeHook({ config: {} });
		expect(mergeSettings([hookNoConfig])).toEqual({ hooks: {} });
	});
});

describe("toSettingsJson", () => {
	it("retourne un JSON valide", () => {
		const json = toSettingsJson([hookA]);
		expect(() => JSON.parse(json)).not.toThrow();
	});
});

describe("collectScripts", () => {
	it("retourne vide si aucun hook na de script", () => {
		expect(collectScripts([hookA])).toEqual([]);
	});

	it("retourne les scripts des hooks qui en ont", () => {
		const hookWithScript = makeHook({
			config: {},
			implementation: {
				type: "settings_json",
				config: {},
				script_path: ".claude/hooks/test.mjs",
				code_snippet: 'console.log("ok")',
			},
		});
		const result = collectScripts([hookWithScript]);
		expect(result).toHaveLength(1);
		expect(result[0].path).toBe(".claude/hooks/test.mjs");
	});
});

describe("toPluginFiles", () => {
	it("genere plugin.json et hooks/hooks.json", () => {
		const files = toPluginFiles([hookA]);
		expect(files[".claude-plugin/plugin.json"]).toBeDefined();
		expect(files["hooks/hooks.json"]).toBeDefined();
	});

	it("plugin.json contient le slug du hook", () => {
		const files = toPluginFiles([hookA]);
		const plugin = JSON.parse(files[".claude-plugin/plugin.json"]);
		expect(plugin.description).toContain("test-hook");
	});

	it("hooks.json contient la config fusionnee", () => {
		const files = toPluginFiles([hookA]);
		const hooks = JSON.parse(files["hooks/hooks.json"]);
		expect(hooks.hooks.PreToolUse).toHaveLength(1);
	});

	it("encode le code_snippet en base64 dans la commande", () => {
		const hookWithSnippet = makeHook({
			slug: "snip-hook",
			config: {
				hooks: {
					PreToolUse: [
						{
							matcher: "Bash",
							hooks: [
								{
									type: "command",
									command: "node $CLAUDE_PROJECT_DIR/.claude/hooks/snip.mjs",
								},
							],
						},
					],
				},
			},
			implementation: {
				type: "settings_json",
				config: {
					hooks: {
						PreToolUse: [
							{
								matcher: "Bash",
								hooks: [
									{
										type: "command",
										command: "node $CLAUDE_PROJECT_DIR/.claude/hooks/snip.mjs",
									},
								],
							},
						],
					},
				},
				script_path: ".claude/hooks/snip.mjs",
				code_snippet: 'console.log("snip")',
			},
		});
		const files = toPluginFiles([hookWithSnippet]);
		const hooks = JSON.parse(files["hooks/hooks.json"]);
		const cmd = hooks.hooks.PreToolUse[0].hooks[0].command;
		expect(cmd).toContain("base64 -d");
	});

	it("retourne des fichiers vides pour une liste vide", () => {
		const files = toPluginFiles([]);
		expect(JSON.parse(files["hooks/hooks.json"])).toEqual({ hooks: {} });
	});
});

describe("generateInstallScript", () => {
	it("contient le shebang node", () => {
		expect(generateInstallScript([hookA])).toContain("#!/usr/bin/env node");
	});

	it("contient la config fusionnee serialisee", () => {
		const script = generateInstallScript([hookA]);
		expect(script).toContain("hook-a.mjs");
	});

	it("contient la logique de merge", () => {
		expect(generateInstallScript([hookA])).toContain("mergeHooks");
	});
});
