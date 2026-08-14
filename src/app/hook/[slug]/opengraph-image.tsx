import { ImageResponse } from "next/og";
import { getHookBySlug } from "@/lib/hooks";

export const alt = "HookStack — Agentic Hooks for Claude Code";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Per-hook social card: hook name + benefit + event type, same dark brand look
// as the root opengraph-image. Referenced explicitly from generateMetadata
// (file-convention images don't inherit on routes with their own openGraph).
export default async function HookOpengraphImage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const hook = getHookBySlug(slug);

	return new ImageResponse(
		<div
			style={{
				height: "100%",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				padding: "72px 80px",
				background:
					"linear-gradient(135deg, #0b0b12 0%, #1a1635 60%, #2a1f57 100%)",
				color: "white",
				fontFamily: "sans-serif",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<div
					style={{
						display: "flex",
						fontSize: 32,
						fontWeight: 800,
						letterSpacing: -1,
					}}
				>
					HookStack
				</div>
				<div style={{ display: "flex", fontSize: 22, color: "#a1a1aa" }}>
					{hook?.hook_type ?? "Agentic hook"}
					{hook?.trigger && hook.trigger !== "*"
						? ` · ${hook.trigger}`
						: ""}
				</div>
			</div>

			<div style={{ display: "flex", flexDirection: "column" }}>
				<div
					style={{
						display: "flex",
						fontSize: 64,
						fontWeight: 800,
						letterSpacing: -2,
						lineHeight: 1.1,
					}}
				>
					{hook?.name ?? "HookStack"}
				</div>
				{hook?.benefit && (
					<div
						style={{
							display: "flex",
							fontSize: 32,
							marginTop: 20,
							color: "#a5b4fc",
							lineHeight: 1.25,
						}}
					>
						{hook.benefit}
					</div>
				)}
			</div>

			<div style={{ display: "flex", fontSize: 22, color: "#71717a" }}>
				Agentic hooks for Claude Code, Codex &amp; Copilot — install in one
				npx command
			</div>
		</div>,
		{ ...size },
	);
}
