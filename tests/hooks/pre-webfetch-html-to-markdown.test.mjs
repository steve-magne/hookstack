// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/pre-webfetch-html-to-markdown.mjs";

const HTML = `<!DOCTYPE html><html><head><style>body{color:red}</style></head><body><h1>Hello</h1><p>World</p><script>alert(1)</script></body></html>`;
const MARKDOWN = "# Hello\n\nWorld";

function makeDeps({
	fetchResult = HTML,
	convertResult = MARKDOWN,
	pandoc = true,
} = {}) {
	return {
		fetchUrl: vi.fn(() => fetchResult),
		convertHtml: vi.fn(() => convertResult),
		hasPandoc: vi.fn(() => pandoc),
	};
}

describe("pre-webfetch-html-to-markdown", () => {
	it("laisse passer si tool_name != WebFetch", () => {
		expect(
			run(
				{ tool_name: "Read", tool_input: { url: "https://example.com" } },
				makeDeps(),
			),
		).toBeNull();
	});

	it("laisse passer si url absente", () => {
		expect(
			run({ tool_name: "WebFetch", tool_input: {} }, makeDeps()),
		).toBeNull();
	});

	it("laisse passer si url non http", () => {
		expect(
			run(
				{ tool_name: "WebFetch", tool_input: { url: "ftp://example.com" } },
				makeDeps(),
			),
		).toBeNull();
	});

	it("laisse passer si fetch échoue", () => {
		const deps = makeDeps();
		deps.fetchUrl = vi.fn(() => {
			throw new Error("network");
		});
		expect(
			run(
				{ tool_name: "WebFetch", tool_input: { url: "https://example.com" } },
				deps,
			),
		).toBeNull();
	});

	it("laisse passer si la réponse n'est pas du HTML (JSON API)", () => {
		const deps = makeDeps({ fetchResult: '{"ok":true}' });
		expect(
			run(
				{
					tool_name: "WebFetch",
					tool_input: { url: "https://api.example.com/v1" },
				},
				deps,
			),
		).toBeNull();
	});

	it("convertit une page HTML avec pandoc", () => {
		const result = run(
			{
				tool_name: "WebFetch",
				tool_input: { url: "https://docs.example.com/guide" },
			},
			makeDeps(),
		);
		expect(result?.decision).toBe("block");
		expect(result?.reason).toContain("docs.example.com");
		expect(result?.reason).toContain("# Hello");
	});

	it("utilise le stripHtml si pandoc absent", () => {
		const deps = makeDeps({ pandoc: false });
		const result = run(
			{ tool_name: "WebFetch", tool_input: { url: "https://example.com" } },
			deps,
		);
		expect(result?.decision).toBe("block");
		expect(deps.convertHtml).not.toHaveBeenCalled();
		expect(result?.reason).toContain("Hello");
	});

	it("fallback stripHtml si pandoc échoue", () => {
		const deps = makeDeps();
		deps.convertHtml = vi.fn(() => {
			throw new Error("pandoc error");
		});
		const result = run(
			{ tool_name: "WebFetch", tool_input: { url: "https://example.com" } },
			deps,
		);
		expect(result?.decision).toBe("block");
		expect(result?.reason).toContain("Hello");
	});

	it("tronque le contenu si trop long", () => {
		const deps = makeDeps({ convertResult: "a".repeat(40_000) });
		const result = run(
			{ tool_name: "WebFetch", tool_input: { url: "https://example.com" } },
			deps,
		);
		expect(result?.reason).toContain("truncated");
		expect(result?.reason.length).toBeLessThan(35_000);
	});

	it("laisse passer si le résultat converti est vide", () => {
		const deps = makeDeps({
			convertResult: "   ",
			pandoc: false,
			fetchResult: "<!DOCTYPE html><html><body></body></html>",
		});
		expect(
			run(
				{ tool_name: "WebFetch", tool_input: { url: "https://example.com" } },
				deps,
			),
		).toBeNull();
	});

	it("inclut le domaine dans la reason", () => {
		const result = run(
			{ tool_name: "WebFetch", tool_input: { url: "https://nextjs.org/docs" } },
			makeDeps(),
		);
		expect(result?.reason).toContain("nextjs.org");
	});
});
