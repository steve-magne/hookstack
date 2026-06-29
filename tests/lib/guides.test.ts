import { describe, expect, it } from "vitest";
import { getGuideBySlug, guides } from "@/lib/guides";
import { getHookBySlug } from "@/lib/hooks";

describe("getGuideBySlug", () => {
	it("finds an existing guide", () => {
		const slug = guides[0]?.slug;
		expect(slug).toBeDefined();
		expect(getGuideBySlug(slug)?.slug).toBe(slug);
	});

	it("returns undefined for an unknown slug", () => {
		expect(getGuideBySlug("not-a-real-guide")).toBeUndefined();
	});
});

describe("guides data integrity", () => {
	it("has unique slugs", () => {
		const slugs = guides.map((g) => g.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it("every guide has core content (intro, sections, faq, sources)", () => {
		for (const g of guides) {
			expect(g.intro.length).toBeGreaterThan(0);
			expect(g.sections.length).toBeGreaterThan(0);
			expect(g.faq.length).toBeGreaterThan(0);
			expect(g.sources.length).toBeGreaterThan(0);
			expect(g.title.length).toBeGreaterThan(0);
			expect(g.description.length).toBeGreaterThan(0);
		}
	});

	it("uses ISO dates", () => {
		for (const g of guides) {
			expect(g.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(g.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		}
	});

	it("every relatedHookSlug resolves to a real hook (no broken internal links)", () => {
		for (const g of guides) {
			for (const slug of g.relatedHookSlugs) {
				expect(
					getHookBySlug(slug),
					`guide "${g.slug}" → unknown hook "${slug}"`,
				).toBeDefined();
			}
		}
	});

	it("every source has a label and an https URL", () => {
		for (const g of guides) {
			for (const src of g.sources) {
				expect(src.label.length).toBeGreaterThan(0);
				expect(src.url).toMatch(/^https:\/\//);
			}
		}
	});
});
