import type { Metadata } from "next";
import Link from "next/link";
import { allHooks } from "@/lib/hooks";
import {
	ISSUES_URL,
	MAINTAINER,
	PERSON_SAME_AS,
	SAME_AS,
	SITE,
} from "@/lib/site";

const TITLE = "About HookStack";
const DESCRIPTION =
	"HookStack is an open-source catalogue of agentic hooks for Claude Code, maintained by Steve Magne and dogfooded on its own repository. Learn who builds it and why.";

export const metadata: Metadata = {
	title: TITLE,
	description: DESCRIPTION,
	openGraph: {
		title: `${TITLE} — HookStack`,
		description: DESCRIPTION,
		url: `${SITE.base}/about`,
		siteName: "HookStack",
		type: "profile",
	},
	alternates: { canonical: `${SITE.base}/about` },
};

const SECTIONS: { heading: string; body: string[] }[] = [
	{
		heading: "What is HookStack?",
		body: [
			`HookStack is an open-source catalogue of agentic hooks for Claude Code. It currently lists ${allHooks.length} hooks, each a small Node.js script that runs at a Claude Code lifecycle event to enforce security, add quality checks, inject context, or automate a workflow.`,
			"The goal is simple: let any developer install a production-ready stack of guardrails in one npx command, then fine-tune it hook by hook.",
		],
	},
	{
		heading: "How is HookStack built?",
		body: [
			"Every hook in the catalogue is dogfooded on the HookStack repository itself: the same scripts run on every Claude Code session that touches this project, which validates them in real conditions. Each hook ships with a unit test, and the live source on disk is the single source of truth for the code you install.",
			"That means the snippet you copy is exactly the code the maintainer runs and tests — not a stale approximation.",
		],
	},
	{
		heading: "How can I get in touch or contribute?",
		body: [
			"For feedback, bug reports, or hook ideas, the best channel is a GitHub issue on the repository — it keeps the discussion public and trackable. You can also submit a hook by pull request, or star the project to follow along.",
			"To reach the maintainer directly, Steve Magne is on LinkedIn. The CLI is published on npm as hookstack-cli.",
		],
	},
];

export default function AboutPage() {
	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "AboutPage",
		url: `${SITE.base}/about`,
		name: TITLE,
		description: DESCRIPTION,
		mainEntity: {
			"@type": "Organization",
			name: "HookStack",
			url: SITE.base,
			logo: `${SITE.base}/web-app-manifest-512x512.png`,
			foundingDate: SITE.foundingDate,
			sameAs: SAME_AS,
			founder: {
				"@type": "Person",
				name: MAINTAINER.name,
				url: MAINTAINER.url,
				sameAs: PERSON_SAME_AS,
			},
		},
	};

	const breadcrumbJsonLd = {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: [
			{ "@type": "ListItem", position: 1, name: "HookStack", item: SITE.base },
			{
				"@type": "ListItem",
				position: 2,
				name: "About",
				item: `${SITE.base}/about`,
			},
		],
	};

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered JSON-LD from our own data, never user input
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered JSON-LD from our own data, never user input
				dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
			/>

			{/* AboutPage */}
			<div data-component="AboutPage" className="mx-auto max-w-3xl px-4 py-12">
				<h1 className="mb-4 text-3xl font-bold text-white">About HookStack</h1>
				<p className="mb-10 text-lg text-zinc-300">{DESCRIPTION}</p>

				<section className="mb-8">
					<h2 className="mb-3 text-xl font-semibold text-white">
						Who maintains HookStack?
					</h2>
					<p className="mb-3 leading-relaxed text-zinc-400">
						HookStack is created and maintained by Steve Magne, an AI Agentic,
						OS Agentic, and Vibe Coding coach. Steve is not a developer — he is
						a practitioner who set up agentic hooks on his own projects (
						<a
							href="https://www.movinglive.ca/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-[var(--color-brand)] hover:underline"
						>
							movinglive.ca
						</a>{" "}
						and{" "}
						<a
							href="https://cyberharp.app/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-[var(--color-brand)] hover:underline"
						>
							cyberharp.app
						</a>
						) and wanted to make them available to the community.
					</p>
					<p className="mb-3 leading-relaxed text-zinc-400">
						The project is built in the open on GitHub, and contributions and
						hook submissions are welcome. There is no company behind it and no
						paywall — the catalogue and every hook implementation are released
						under the MIT licence.
					</p>
				</section>

				{SECTIONS.map((s) => (
					<section key={s.heading} className="mb-8">
						<h2 className="mb-3 text-xl font-semibold text-white">
							{s.heading}
						</h2>
						{s.body.map((p) => (
							<p key={p} className="mb-3 leading-relaxed text-zinc-400">
								{p}
							</p>
						))}
					</section>
				))}

				{/* AboutPage-maintainer */}
				<section
					data-component="AboutPage-maintainer"
					className="mb-10 rounded-xl border border-[var(--color-border)] bg-[#0d0d14] p-5"
				>
					<h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">
						Maintainer
					</h2>
					<p className="text-lg font-semibold text-white">{MAINTAINER.name}</p>
					<p className="mb-3 text-sm text-zinc-400">{MAINTAINER.role}</p>
					<div className="flex flex-wrap gap-4 text-sm">
						<a
							href={MAINTAINER.linkedin}
							target="_blank"
							rel="noopener noreferrer"
							className="text-[var(--color-brand)] hover:underline"
						>
							LinkedIn
						</a>
						<a
							href={MAINTAINER.github}
							target="_blank"
							rel="noopener noreferrer"
							className="text-[var(--color-brand)] hover:underline"
						>
							GitHub profile
						</a>
						<a
							href={ISSUES_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="text-[var(--color-brand)] hover:underline"
						>
							Report an issue
						</a>
						<a
							href={SITE.npm}
							target="_blank"
							rel="noopener noreferrer"
							className="text-[var(--color-brand)] hover:underline"
						>
							npm package
						</a>
					</div>
				</section>

				<div className="flex flex-wrap gap-4 text-sm">
					<Link href="/" className="text-zinc-300 hover:text-white">
						← Back to the catalogue
					</Link>
					<Link href="/guides" className="text-zinc-300 hover:text-white">
						Read the guides →
					</Link>
				</div>
			</div>
		</>
	);
}
