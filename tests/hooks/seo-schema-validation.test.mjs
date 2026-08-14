// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/seo-schema-validation.mjs";

const input = (file_path) => ({ tool_input: { file_path } });
const deps = (content, getSize = () => 100) => ({
	readFile: () => content,
	getSize,
});
const PAGE = "/p/src/app/about/page.tsx";
const HTML = "/p/public/index.html";

const VALID_BLOCK = (extra = {}) =>
	`<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "Article",
		...extra,
	})}</script>`;

describe("seo-schema-validation", () => {
	it("ignore les fichiers hors extensions HTML-like", () => {
		expect(run(input("/p/README.md"), deps(""))).toBeNull();
		expect(run(input("/p/lib/utils.ts"), deps(""))).toBeNull();
	});

	it("valide aussi les extensions en majuscules", () => {
		const r = run(
			input("/p/public/INDEX.HTML"),
			deps(`<script type="application/ld+json">{invalid}</script>`),
		);
		expect(r?.message).toContain("invalid JSON");
		expect(r?.exitCode).toBeUndefined();
	});

	it("ignore un fichier illisible", () => {
		expect(
			run(input(PAGE), {
				readFile: () => {
					throw new Error("ENOENT");
				},
				getSize: () => 100,
			}),
		).toBeNull();
	});

	it("ignore un fichier de plus de 10 Mo", () => {
		expect(run(input(HTML), deps("", 11 * 1024 * 1024))).toBeNull();
	});

	it("silencieux quand aucun bloc ld+json n'est présent", () => {
		expect(run(input(HTML), deps("<html><body>hi</body></html>"))).toBeNull();
	});

	it("silencieux quand le bloc est valide", () => {
		expect(run(input(HTML), deps(VALID_BLOCK()))).toBeNull();
	});

	it("signale un JSON invalide sans bloquer", () => {
		const r = run(
			input(HTML),
			deps('<script type="application/ld+json">{oops</script>'),
		);
		expect(r?.message).toContain("invalid JSON");
		expect(r?.message).toContain("Block 1");
		expect(r?.exitCode).toBeUndefined();
	});

	it("signale un @context manquant sans bloquer", () => {
		const r = run(
			input(HTML),
			deps(`<script type="application/ld+json">{"@type":"Article"}</script>`),
		);
		expect(r?.message).toContain("missing @context");
		expect(r?.exitCode).toBeUndefined();
	});

	it("signale un @context non schema.org sans bloquer", () => {
		const r = run(
			input(HTML),
			deps(
				`<script type="application/ld+json">{"@context":"https://example.com","@type":"Article"}</script>`,
			),
		);
		expect(r?.message).toContain("@context should be 'https://schema.org'");
		expect(r?.exitCode).toBeUndefined();
	});

	it("signale un @type manquant sans bloquer", () => {
		const r = run(
			input(HTML),
			deps(
				`<script type="application/ld+json">{"@context":"https://schema.org"}</script>`,
			),
		);
		expect(r?.message).toContain("missing @type");
		expect(r?.exitCode).toBeUndefined();
	});

	it("bloque sur du texte placeholder", () => {
		const r = run(
			input(HTML),
			deps(
				VALID_BLOCK({ name: "[Business Name]", address: "[City], [State]" }),
			),
		);
		expect(r?.exitCode).toBe(2);
		expect(r?.message).toContain("placeholder text: [Business Name]");
		expect(r?.message).toContain("(blocking)");
	});

	it("bloque sur un type schema.org déprécié", () => {
		const r = run(input(HTML), deps(VALID_BLOCK({ "@type": "HowTo" })));
		expect(r?.exitCode).toBe(2);
		expect(r?.message).toContain("'HowTo' is deprecated September 2023");
	});

	it("bloque sur un type retiré", () => {
		const r = run(input(HTML), deps(VALID_BLOCK({ "@type": "ClaimReview" })));
		expect(r?.exitCode).toBe(2);
		expect(r?.message).toContain("ClaimReview");
	});

	it("valide chaque objet d'un tableau JSON-LD", () => {
		const r = run(
			input(HTML),
			deps(
				`<script type="application/ld+json">[${JSON.stringify({
					"@context": "https://schema.org",
					"@type": "Article",
				})},${JSON.stringify({ "@type": "BreadcrumbList" })}]</script>`,
			),
		);
		// Les deux objets sont dans le même bloc script → même numéro de bloc.
		expect(r?.message).toContain("Block 1: missing @context");
		expect(r?.message).not.toContain("invalid JSON");
		expect(r?.exitCode).toBeUndefined();
	});

	it("liste warnings et erreurs bloquantes ensemble", () => {
		const r = run(
			input(HTML),
			deps(
				`<script type="application/ld+json">${JSON.stringify({
					"@type": "HowTo",
					name: "[Your Project Name]",
				})}</script>`,
			),
		);
		expect(r?.exitCode).toBe(2);
		expect(r?.message).toContain("missing @context");
		expect(r?.message).toContain("placeholder text: [Your");
		expect(r?.message).toContain("'HowTo' is deprecated");
	});
});
