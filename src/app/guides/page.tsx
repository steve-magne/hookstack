import type { Metadata } from "next";
import Link from "next/link";
import { guides } from "@/lib/guides";
import { SITE } from "@/lib/site";

const TITLE = "Claude Code Hooks Guides";
const DESCRIPTION =
	"In-depth guides on Claude Code hooks: what they are, when to use PreToolUse vs PostToolUse, and how hooks compare to slash commands and prompt instructions.";

export const metadata: Metadata = {
	title: TITLE,
	description: DESCRIPTION,
	openGraph: {
		title: `${TITLE} — HookStack`,
		description: DESCRIPTION,
		url: `${SITE.base}/guides`,
		siteName: "HookStack",
		type: "website",
	},
	alternates: { canonical: `${SITE.base}/guides` },
};

export default function GuidesIndexPage() {
	const itemListJsonLd = {
		"@context": "https://schema.org",
		"@type": "ItemList",
		name: TITLE,
		url: `${SITE.base}/guides`,
		numberOfItems: guides.length,
		itemListElement: guides.map((g, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: g.title,
			description: g.description,
			url: `${SITE.base}/guides/${g.slug}`,
		})),
	};

	const breadcrumbJsonLd = {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: [
			{ "@type": "ListItem", position: 1, name: "HookStack", item: SITE.base },
			{
				"@type": "ListItem",
				position: 2,
				name: "Guides",
				item: `${SITE.base}/guides`,
			},
		],
	};

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered JSON-LD from our own data, never user input
				dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
			/>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered JSON-LD from our own data, never user input
				dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
			/>

			{/* GuidesIndexPage */}
			<div
				data-component="GuidesIndexPage"
				className="mx-auto max-w-3xl px-4 py-12"
			>
				<h1 className="mb-4 text-3xl font-bold text-white">
					Claude Code Hooks Guides
				</h1>
				<p className="mb-10 text-lg text-zinc-300">{DESCRIPTION}</p>

				<ul className="space-y-4">
					{guides.map((g) => (
						<li key={g.slug}>
							<Link
								href={`/guides/${g.slug}`}
								className="block rounded-xl border border-[var(--color-border)] bg-[#0d0d14] p-5 transition-colors hover:border-[var(--color-text-muted)]"
							>
								<h2 className="mb-1 text-lg font-semibold text-white">
									{g.title}
								</h2>
								<p className="mb-2 text-sm leading-relaxed text-zinc-400">
									{g.description}
								</p>
								<span className="text-xs uppercase tracking-wide text-zinc-500">
									{g.readingMinutes} min read
								</span>
							</Link>
						</li>
					))}
				</ul>

				<div className="mt-10">
					<Link href="/" className="text-sm text-zinc-300 hover:text-white">
						← Back to the catalogue
					</Link>
				</div>
			</div>
		</>
	);
}
