// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/stop-dead-image-checker.mjs";

function makeFs({ files = {}, dirs = [], publicFiles = [] } = {}) {
	const allFiles = { ...files };
	for (const p of publicFiles) allFiles[p] = "";

	return {
		projectDir: "/proj",
		exists: (p) => p in allFiles || dirs.includes(p) || p === "/proj",
		readdir: (dir) => {
			const entries = [];
			for (const [fp] of Object.entries(allFiles)) {
				if (fp.startsWith(`${dir}/`)) {
					const rel = fp.slice(dir.length + 1);
					if (!rel.includes("/"))
						entries.push({ name: rel, isDirectory: () => false });
				}
			}
			for (const d of dirs) {
				if (d.startsWith(`${dir}/`) && !d.slice(dir.length + 1).includes("/")) {
					entries.push({
						name: d.slice(dir.length + 1),
						isDirectory: () => true,
					});
				}
			}
			return entries;
		},
		readFile: (p) => {
			if (p in allFiles) return allFiles[p];
			throw new Error("ENOENT");
		},
	};
}

describe("stop-dead-image-checker", () => {
	it("retourne null si aucun fichier .md trouvé", () => {
		expect(run({}, makeFs({ files: { "/proj/src/index.ts": "" } }))).toBeNull();
	});

	it("retourne null si aucune image dans les fichiers md", () => {
		const deps = makeFs({
			files: { "/proj/README.md": "# Titre\n[lien](./doc.md)" },
		});
		expect(run({}, deps)).toBeNull();
	});

	it("retourne null si toutes les images relatives existent", () => {
		const deps = makeFs({
			files: {
				"/proj/README.md": "![logo](./assets/logo.png)",
				"/proj/assets/logo.png": "",
			},
			dirs: ["/proj/assets"],
		});
		expect(run({}, deps)).toBeNull();
	});

	it("retourne un message si une image relative est cassée", () => {
		const deps = makeFs({
			files: { "/proj/README.md": "![manquant](./assets/missing.png)" },
		});
		const r = run({}, deps);
		expect(r?.message).toContain("[dead-image-checker]");
		expect(r?.message).toContain("README.md");
		expect(r?.message).toContain("./assets/missing.png");
	});

	it("ignore les images HTTP/HTTPS (pas de réseau)", () => {
		const deps = makeFs({
			files: { "/proj/README.md": "![ext](https://example.com/image.png)" },
		});
		expect(run({}, deps)).toBeNull();
	});

	it("ignore les images data: URI", () => {
		const deps = makeFs({
			files: { "/proj/README.md": "![inline](data:image/png;base64,abc123)" },
		});
		expect(run({}, deps)).toBeNull();
	});

	it("résout les chemins absolus depuis public/ (convention Next.js)", () => {
		const deps = makeFs({
			files: { "/proj/README.md": "![heatmap](/hooks-timeline.svg)" },
			publicFiles: ["/proj/public/hooks-timeline.svg"],
			dirs: ["/proj/public"],
		});
		expect(run({}, deps)).toBeNull();
	});

	it("signale un chemin absolu cassé (introuvable dans public/)", () => {
		const deps = makeFs({
			files: { "/proj/README.md": "![missing](/assets/ghost.png)" },
		});
		const r = run({}, deps);
		expect(r?.message).toContain("[dead-image-checker]");
		expect(r?.message).toContain("/assets/ghost.png");
	});

	it("ne signale pas les liens texte [text](href) comme images", () => {
		const deps = makeFs({
			files: { "/proj/README.md": "[lien](./absent.md)" },
		});
		// Les liens texte sont du ressort de stop-dead-link-checker, pas ici
		expect(run({}, deps)).toBeNull();
	});

	it("couvre tous les fichiers .md et .mdx (scan complet)", () => {
		const readFile = vi.fn(() => "");
		const deps = {
			projectDir: "/proj",
			exists: (p) =>
				["/proj", "/proj/a.md", "/proj/b.mdx", "/proj/c.ts"].includes(p),
			readdir: (dir) =>
				dir === "/proj"
					? [
							{ name: "a.md", isDirectory: () => false },
							{ name: "b.mdx", isDirectory: () => false },
							{ name: "c.ts", isDirectory: () => false },
						]
					: [],
			readFile,
		};
		run({}, deps);
		const paths = readFile.mock.calls.map(([p]) => p);
		expect(paths).toContain("/proj/a.md");
		expect(paths).toContain("/proj/b.mdx");
		expect(paths).not.toContain("/proj/c.ts");
	});

	it("ignore les répertoires node_modules, .git, .claude, .next", () => {
		const readdir = vi.fn((dir) => {
			if (dir === "/proj")
				return [
					{ name: "node_modules", isDirectory: () => true },
					{ name: ".git", isDirectory: () => true },
					{ name: ".claude", isDirectory: () => true },
					{ name: ".next", isDirectory: () => true },
					{ name: "README.md", isDirectory: () => false },
				];
			return [];
		});
		const deps = {
			projectDir: "/proj",
			exists: () => true,
			readdir,
			readFile: () => "",
		};
		run({}, deps);
		const dirs = readdir.mock.calls.map(([d]) => d);
		expect(dirs).not.toContain("/proj/node_modules");
		expect(dirs).not.toContain("/proj/.git");
		expect(dirs).not.toContain("/proj/.claude");
	});

	it("ignore les images dans les blocs de code clôturés (```)", () => {
		const deps = makeFs({
			files: { "/proj/README.md": "```\n![cassé](./missing.png)\n```" },
		});
		expect(run({}, deps)).toBeNull();
	});

	it("ignore les images dans les spans de code inline (`)", () => {
		const deps = makeFs({
			files: { "/proj/README.md": "Syntaxe : `![alt](src)` dans les Markdown" },
		});
		expect(run({}, deps)).toBeNull();
	});

	it("signale plusieurs images cassées dans plusieurs fichiers", () => {
		const deps = makeFs({
			files: {
				"/proj/README.md": "![a](./img/a.png)\n![b](./img/b.png)",
				"/proj/docs/guide.md": "![c](./screens/c.png)",
			},
			dirs: ["/proj/docs"],
		});
		const r = run({}, deps);
		expect(r?.message).toContain("3 broken");
	});
});
