import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{ userAgent: "*", allow: "/" },
			// Training crawlers
			{ userAgent: "GPTBot", allow: "/" },
			{ userAgent: "ClaudeBot", allow: "/" },
			{ userAgent: "anthropic-ai", allow: "/" },
			{ userAgent: "Google-Extended", allow: "/" },
			// Live-citation crawlers — these fetch pages to answer/cite in AI search
			// (the surfaces that actually drive AI-SEO referrals), distinct from the
			// training crawlers above. Explicit even though `*` allows all: signals
			// intent and survives any future tightening of the wildcard rule.
			{ userAgent: "OAI-SearchBot", allow: "/" },
			{ userAgent: "ChatGPT-User", allow: "/" },
			{ userAgent: "PerplexityBot", allow: "/" },
			{ userAgent: "Perplexity-User", allow: "/" },
			{ userAgent: "Googlebot", allow: "/" },
		],
		sitemap: "https://www.hookstack.app/sitemap.xml",
		host: "https://www.hookstack.app",
	};
}
