/**
 * themes.ts — thématiques de filtrage orientées *besoin*.
 *
 * Le registre porte des `tags` techniques (234 distincts, longue traîne bruitée).
 * Un dev ne cherche pas "jscpd" ou "definition-of-done" — il cherche "comment
 * éviter de leak des secrets", "monitoring", "tests". On projette donc les tags
 * + slug + benefit vers une **allowlist curée** (~12 thèmes), chacun dérivé par
 * règles. Aucun champ registre à maintenir : la barre suit le catalogue.
 *
 * Sémantique OU au filtrage : un hook peut porter plusieurs thèmes ; en
 * sélectionner plusieurs élargit le filet.
 */
import type { Hook } from "@/types/hook";

export interface Theme {
	id: string;
	label: string;
	/** Substrings recherchés (lowercase) dans tags + slug + benefit. */
	matchers: string[];
}

export const THEMES: Theme[] = [
	{
		id: "secrets",
		label: "Secrets & data leaks",
		matchers: ["secret", "pii", "redact", "gdpr", "pci"],
	},
	{
		id: "safety",
		label: "Safety & guardrails",
		matchers: [
			"safety",
			"guardrail",
			"destructive",
			"force-push",
			"supply-chain",
			"sudo",
			"curl",
			"write-guard",
			"branch-discipline",
		],
	},
	{
		id: "git",
		label: "Git & branching",
		matchers: [
			"main-branch",
			"force-push",
			"block-push",
			"stash",
			"changelog",
			"push-main",
			"conflict-marker",
		],
	},
	{
		id: "tests",
		label: "Tests & coverage",
		matchers: ["test", "coverage", "missing-test", "pytest", "vitest"],
	},
	{
		id: "quality",
		label: "Code quality",
		matchers: [
			"lint",
			"format",
			"typecheck",
			"code-quality",
			"duplication",
			"ruff",
			"prettier",
			"biome",
			"pyright",
			"console-log",
		],
	},
	{
		id: "monitoring",
		label: "Monitoring & alerts",
		matchers: [
			"monitoring",
			"observability",
			"metric",
			"alert",
			"finops",
			"rate-limit",
			"cost-tracker",
		],
	},
	{
		id: "tokens",
		label: "Context & token savings",
		matchers: [
			"context-optimization",
			"token",
			"compact",
			"markdown",
			"binary",
			"hallucination",
		],
	},
	{
		id: "conventions",
		label: "Conventions & standards",
		matchers: ["convention", "standard", "motion", "animation", "i18n", "naming"],
	},
	{
		id: "seo",
		label: "SEO & accessibility",
		matchers: [
			"seo",
			"accessibility",
			"a11y",
			"wcag",
			"core-web-vitals",
			"indexing",
			"crawlability",
			"metadata",
		],
	},
	{
		id: "worktrees",
		label: "Worktrees & multi-agent",
		matchers: ["worktree", "multi-agent", "isolation", "parallel-agent"],
	},
	{
		id: "automation",
		label: "Automation & productivity",
		matchers: [
			"automation",
			"productivity",
			"auto-allow",
			"sync",
			"onboarding",
			"bootstrap",
		],
	},
	{
		id: "compliance",
		label: "Audit & compliance",
		matchers: ["compliance", "traceability", "devsecops", "audit-log"],
	},
];

const THEME_BY_ID = new Map(THEMES.map((t) => [t.id, t]));

export function themeLabel(id: string): string {
	return THEME_BY_ID.get(id)?.label ?? id;
}

const cache = new WeakMap<Hook, string[]>();

/**
 * Thèmes d'un hook, dérivés de ses tags + slug + benefit (lowercase).
 * Mémoïsé par hook : appelé à chaque rendu de catalogue et à chaque filtrage.
 */
export function matchThemes(hook: Hook): string[] {
	const cached = cache.get(hook);
	if (cached) return cached;
	const hay = [
		hook.slug,
		hook.benefit ?? "",
		hook.description ?? "",
		...(hook.tags ?? []),
	]
		.join(" ")
		.toLowerCase();
	const ids = THEMES.filter((t) =>
		t.matchers.some((m) => hay.includes(m)),
	).map((t) => t.id);
	cache.set(hook, ids);
	return ids;
}
