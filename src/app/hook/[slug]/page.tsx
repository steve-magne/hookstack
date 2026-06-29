import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CategoryBadge, HookTypeBadge } from "@/components/Badge";
import { HookDetailTracker } from "@/components/HookDetailTracker";
import { HookSelectButton } from "@/components/HookSelectButton";
import { allHooks, getHookBySlug } from "@/lib/hooks";
import { SEO_KEYWORDS, T } from "@/lib/i18n";
import { hookSourceUrl, MAINTAINER, PERSON_SAME_AS, SITE } from "@/lib/site";
import { HOOK_TYPE_INFO, type HookTypeInfo } from "@/types/hook";

const BASE = "https://www.hookstack.app";

export async function generateStaticParams() {
	return allHooks.map((hook) => ({ slug: hook.slug }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const hook = getHookBySlug(slug);
	if (!hook) return {};

	const keywords = [...SEO_KEYWORDS, ...hook.tags];

	return {
		title: hook.name,
		description: hook.description,
		keywords,
		openGraph: {
			title: `${hook.name} — HookStack`,
			description: hook.description,
			url: `${BASE}/hook/${slug}`,
			siteName: "HookStack",
			type: "article",
		},
		twitter: {
			card: "summary",
			title: `${hook.name} — HookStack`,
			description: hook.description,
		},
		alternates: { canonical: `${BASE}/hook/${slug}` },
	};
}

export default async function HookDetailPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const hook = getHookBySlug(slug);

	if (!hook) {
		return (
			<div className="mx-auto max-w-3xl px-4 py-16 text-center text-zinc-400">
				<p>{T.hookNotFound}</p>
				<Link
					href="/"
					className="mt-4 inline-block text-[var(--color-brand)] underline"
				>
					{T.backToCatalogue}
				</Link>
			</div>
		);
	}

	const settingsFragment = JSON.stringify(hook.implementation.config, null, 2);
	// The registry can carry events newer than the typed map (cast at load time),
	// so look-ups may be undefined — guard accordingly.
	const eventInfo: HookTypeInfo | undefined = HOOK_TYPE_INFO[hook.hook_type];
	const sourceUrl = hookSourceUrl(hook.implementation.script_path);

	// Related hooks for internal linking: same category first, then same event.
	const sameCategory = allHooks.filter(
		(h) => h.slug !== hook.slug && h.category === hook.category,
	);
	const sameEvent = allHooks.filter(
		(h) =>
			h.slug !== hook.slug &&
			h.hook_type === hook.hook_type &&
			h.category !== hook.category,
	);
	const relatedHooks = [...sameCategory, ...sameEvent].slice(0, 4);

	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "SoftwareSourceCode",
		name: hook.name,
		description: hook.benefit
			? `${hook.benefit} — ${hook.description}`
			: hook.description,
		keywords: [...SEO_KEYWORDS, ...hook.tags].join(", "),
		programmingLanguage: "JavaScript",
		runtimePlatform: "Node.js",
		url: `${BASE}/hook/${hook.slug}`,
		...(sourceUrl ? { codeRepository: sourceUrl } : {}),
		license: "https://opensource.org/licenses/MIT",
		isAccessibleForFree: true,
		datePublished: SITE.contentUpdated,
		dateModified: SITE.contentUpdated,
		author: {
			"@type": "Person",
			name: MAINTAINER.name,
			url: MAINTAINER.url,
			sameAs: PERSON_SAME_AS,
		},
		maintainer: { "@type": "Organization", name: "HookStack", url: BASE },
		isPartOf: {
			"@type": "WebSite",
			name: "HookStack",
			url: BASE,
		},
	};

	const breadcrumbJsonLd = {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: [
			{ "@type": "ListItem", position: 1, name: "HookStack", item: BASE },
			{
				"@type": "ListItem",
				position: 2,
				name: "Hooks",
				item: `${BASE}/#catalogue`,
			},
			{
				"@type": "ListItem",
				position: 3,
				name: hook.name,
				item: `${BASE}/hook/${hook.slug}`,
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
			<HookDetailTracker
				slug={hook.slug}
				name={hook.name}
				category={hook.category}
				event={hook.hook_type}
			/>
			{/* HookDetailPage */}
			<div
				data-component="HookDetailPage"
				className="mx-auto max-w-3xl px-4 py-8"
			>
				{/* HookDetailPage-back */}
				<Link
					data-component="HookDetailPage-back"
					href="/"
					className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
				>
					<ArrowLeft className="size-4" /> {T.backToCatalogue}
				</Link>

				{/* HookDetailPage-badges */}
				<div
					data-component="HookDetailPage-badges"
					className="mb-4 flex items-center gap-2"
				>
					<CategoryBadge category={hook.category} />
					<HookTypeBadge type={hook.hook_type} trigger={hook.trigger} />
				</div>

				<h1 className="mb-3 text-3xl font-bold text-white">{hook.name}</h1>
				{hook.benefit && (
					<p className="mb-3 text-lg font-medium text-[var(--color-brand)]">
						{hook.benefit}
					</p>
				)}
				<p className="mb-6 text-lg text-zinc-300">{hook.description}</p>

				{/* HookSelectButton */}
				<HookSelectButton slug={hook.slug} />

				{/* HookDetailPage-answer — question-phrased direct answer (AEO / featured snippets) */}
				<section data-component="HookDetailPage-answer" className="mt-8">
					<h2 className="mb-2 text-lg font-semibold text-white">
						What does the {hook.name} hook do?
					</h2>
					<p className="text-zinc-300">
						{hook.name} is a Claude Code <strong>{hook.hook_type}</strong> hook
						{hook.trigger && hook.trigger !== "*"
							? ` matching ${hook.trigger}`
							: ""}
						. It fires automatically at that lifecycle event — outside the
						model, so it can&apos;t be skipped or forgotten.
						{hook.benefit ? ` ${hook.benefit}.` : ""}
					</p>
					<p className="mt-3 text-sm leading-relaxed text-zinc-400">
						{eventInfo &&
							(eventInfo.blocking
								? `As a ${hook.hook_type} hook it runs before the action completes, so it can block or adjust what Claude is about to do. `
								: `As a ${hook.hook_type} hook it runs after the action, reacting to what just happened rather than blocking it. `)}
						Because it is a deterministic Node.js script, it executes on every
						matching event without relying on the model to remember — the
						guarantee that makes agentic workflows safe to automate.
					</p>
				</section>

				{/* HookDetailPage-details-grid */}
				<div
					data-component="HookDetailPage-details-grid"
					className="grid gap-6 sm:grid-cols-2"
				>
					{/* HookDetailPage-use-cases */}
					<div data-component="HookDetailPage-use-cases">
						<h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
							{T.useCases}
						</h2>
						<ul className="space-y-1.5 text-sm text-zinc-300">
							{hook.use_cases.map((u) => (
								<li key={u} className="flex items-start gap-2">
									<span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-brand)]" />
									{u}
								</li>
							))}
						</ul>
					</div>
					<div>
						<h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
							{T.tags}
						</h2>
						<div className="flex flex-wrap gap-1.5">
							{hook.tags.map((t) => (
								<span key={t} className="text-xs text-zinc-500">
									#{t}
								</span>
							))}
						</div>
					</div>
				</div>

				{/* HookDetailPage-settings-fragment */}
				<div data-component="HookDetailPage-settings-fragment" className="mt-8">
					<h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
						{T.settingsFragment}
					</h2>
					<pre className="overflow-auto rounded-xl border border-[var(--color-border)] bg-[#0d0d14] p-4 text-xs text-zinc-200">
						<code>{settingsFragment}</code>
					</pre>
				</div>

				{/* HookDetailPage-code-snippet */}
				{hook.implementation.code_snippet && (
					<div data-component="HookDetailPage-code-snippet" className="mt-6">
						<h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
							Script · {hook.implementation.script_path}
						</h2>
						<pre className="overflow-auto rounded-xl border border-[var(--color-border)] bg-[#0d0d14] p-4 text-xs text-zinc-200">
							<code>{hook.implementation.code_snippet}</code>
						</pre>
					</div>
				)}

				{/* HookDetailPage-learn-more — outbound citations (authoritative docs + source) */}
				<section
					data-component="HookDetailPage-learn-more"
					className="mt-8 border-t border-[var(--color-border)] pt-6"
				>
					<h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
						Learn more
					</h2>
					<ul className="space-y-1.5 text-sm">
						<li>
							<a
								href={SITE.claudeCodeHooksDocs}
								target="_blank"
								rel="noopener noreferrer"
								className="text-[var(--color-brand)] hover:underline"
							>
								Claude Code hooks — official Anthropic documentation
							</a>
						</li>
						{sourceUrl && (
							<li>
								<a
									href={sourceUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-[var(--color-brand)] hover:underline"
								>
									View this hook&apos;s source on GitHub
								</a>
							</li>
						)}
						<li>
							{hook.hook_type === "PreToolUse" ||
							hook.hook_type === "PostToolUse" ? (
								<Link
									href="/guides/pretooluse-vs-posttooluse"
									className="text-[var(--color-brand)] hover:underline"
								>
									Guide: PreToolUse vs PostToolUse — choosing the right hook
									event
								</Link>
							) : (
								<Link
									href="/guides/what-are-claude-code-hooks"
									className="text-[var(--color-brand)] hover:underline"
								>
									Guide: What are Claude Code hooks?
								</Link>
							)}
						</li>
						<li>
							<Link
								href="/guides/claude-code-hooks-not-working"
								className="text-[var(--color-brand)] hover:underline"
							>
								Hook not firing? Troubleshooting guide
							</Link>
						</li>
					</ul>
				</section>

				{/* HookDetailPage-related — internal cross-links to similar hooks */}
				{relatedHooks.length > 0 && (
					<section data-component="HookDetailPage-related" className="mt-8">
						<h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
							Related hooks
						</h2>
						<ul className="grid gap-3 sm:grid-cols-2">
							{relatedHooks.map((rel) => (
								<li key={rel.slug}>
									<Link
										href={`/hook/${rel.slug}`}
										className="block rounded-lg border border-[var(--color-border)] bg-[#0d0d14] p-3 transition-colors hover:border-[var(--color-text-muted)]"
									>
										<span className="block text-sm font-medium text-white">
											{rel.name}
										</span>
										{rel.benefit && (
											<span className="block text-xs text-zinc-500">
												{rel.benefit}
											</span>
										)}
									</Link>
								</li>
							))}
						</ul>
					</section>
				)}
			</div>
		</>
	);
}
