import { ArrowLeft, Github, Home, Terminal } from "lucide-react";
import Link from "next/link";
import { NotFoundScene3D } from "@/components/NotFoundScene3D";
import { SplitFlap } from "@/components/SplitFlap";
import { splitFlapHero } from "@/lib/motion";

const diagnostics = [
	["event", "Navigation"],
	["matcher", "/unknown-route"],
	["status", "404_NOT_FOUND"],
	["fallback", "catalogue:index"],
] as const;

export default function NotFoundPage() {
	return (
		<div
			data-component="NotFoundPage"
			className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[0.92fr_1.08fr] lg:py-16"
		>
			<section className="relative min-w-0">
				<div
					aria-hidden
					className="pointer-events-none absolute -left-8 top-4 -z-10 h-72 w-72 rounded-full bg-white/5 blur-[120px]"
				/>

				<p className="mb-5 inline-flex items-center gap-2 rounded-lg border border-zinc-700/70 bg-zinc-900/70 px-3 py-1.5 font-mono text-xs text-zinc-400">
					<Terminal className="size-3.5 text-zinc-400" />
					route.check --strict
				</p>

				<h1 className="max-w-2xl text-balance text-4xl font-bold leading-[1.03] tracking-tight text-white sm:text-5xl xl:text-6xl">
					<SplitFlap text="Lost route." eager {...splitFlapHero} />
					<br />
					<SplitFlap
						text="Hook graph still intact."
						delay={("Lost route.".length + 1) * splitFlapHero.perChar}
						eager
						block
						{...splitFlapHero}
					/>
				</h1>

				<p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-zinc-300 sm:text-lg">
					This URL did not match a published hook, but the catalogue is still
					wired. Rejoin the index, inspect the source, or keep the install flow
					moving.
				</p>

				<div className="mt-8 flex flex-col gap-3 sm:flex-row">
					<Link
						href="/#catalogue"
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/5 active:bg-white/10"
					>
						<ArrowLeft className="size-4" />
						Back to catalogue
					</Link>
					<Link
						href="/"
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-600 bg-[var(--color-surface-2)] px-4 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-[var(--color-surface-2)]/80"
					>
						<Home className="size-4" />
						Home
					</Link>
					<a
						href="https://github.com/steve-magne/hookstack"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-zinc-400 transition-colors hover:text-white"
					>
						<Github className="size-4" />
						Source
					</a>
				</div>

				<div className="mt-9 overflow-hidden rounded-xl border border-zinc-700/70 bg-[#0c0c12] shadow-lg shadow-black/40">
					<div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.015] px-3.5 py-2">
						<span aria-hidden className="flex gap-1.5">
							<span className="size-2.5 rounded-full bg-[#ff5f57]" />
							<span className="size-2.5 rounded-full bg-[#febc2e]" />
							<span className="size-2.5 rounded-full bg-[#28c840]" />
						</span>
						<span className="ml-1 font-mono text-[11px] text-zinc-500">
							diagnostics
						</span>
					</div>
					<dl className="grid gap-px bg-white/5 sm:grid-cols-2">
						{diagnostics.map(([key, value]) => (
							<div key={key} className="bg-[#0c0c12] px-4 py-3">
								<dt className="font-mono text-[10px] uppercase tracking-wide text-zinc-600">
									{key}
								</dt>
								<dd className="mt-1 truncate font-mono text-xs text-zinc-300">
									{value}
								</dd>
							</div>
						))}
					</dl>
				</div>
			</section>

			<section aria-label="3D hook routing scene" className="relative">
				<NotFoundScene3D />
				<div className="mt-4 grid gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800 sm:grid-cols-3">
					{[
						["01", "Detect", "The route miss is isolated."],
						["02", "Preserve", "No install state is touched."],
						["03", "Recover", "Catalogue fallback is one click away."],
					].map(([step, title, desc]) => (
						<div key={step} className="bg-zinc-950 px-4 py-4">
							<span className="font-mono text-xs font-semibold text-zinc-400">
								{step}
							</span>
							<p className="mt-2 text-sm font-semibold text-white">{title}</p>
							<p className="mt-1 text-xs leading-relaxed text-zinc-500">
								{desc}
							</p>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
