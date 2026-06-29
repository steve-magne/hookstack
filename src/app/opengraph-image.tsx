import { ImageResponse } from "next/og";

// Image Open Graph générée à la volée par Next.js (convention de fichier).
// Sa seule présence injecte automatiquement <meta og:image> ET <meta
// twitter:image> (+ dimensions) sur la home et toutes les routes enfant qui
// ne définissent pas leur propre image — réparant les cartes sociales vides.
export const alt = "HookStack — Agentic Hooks for Claude Code";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
	return new ImageResponse(
		<div
			style={{
				height: "100%",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				padding: "90px",
				background:
					"linear-gradient(135deg, #0b0b12 0%, #1a1635 60%, #2a1f57 100%)",
				color: "white",
				fontFamily: "sans-serif",
			}}
		>
			<div
				style={{
					display: "flex",
					fontSize: 92,
					fontWeight: 800,
					letterSpacing: -3,
				}}
			>
				HookStack
			</div>
			<div
				style={{
					display: "flex",
					fontSize: 42,
					marginTop: 18,
					color: "#a5b4fc",
				}}
			>
				Agentic Hooks for Claude Code
			</div>
			<div
				style={{
					display: "flex",
					fontSize: 28,
					marginTop: 40,
					color: "#a1a1aa",
				}}
			>
				Ship fast. Break nothing. — install your stack in one npx command
			</div>
		</div>,
		{ ...size },
	);
}
