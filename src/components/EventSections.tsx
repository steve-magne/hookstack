"use client";

import { m, useScroll } from "motion/react";
import { useRef } from "react";
import { useT } from "@/lib/locale-context";
import { HOOK_TYPE_INFO, type Hook, type HookTypeInfo } from "@/types/hook";
import { HookRow } from "./HookRow";
import { SplitFlap } from "./SplitFlap";

/**
 * EventSections — le catalogue en mode « Event », façon Vercel /eve.
 *
 * Chaque événement devient une section deux colonnes :
 *  - à gauche, une colonne **sticky** qui explique l'événement (numéro,
 *    nom mono, label cycle de vie, blurb, matchers dominants) ;
 *  - à droite, les **tuiles des hooks associés** qui défilent sous la colonne
 *    épinglée (pin-and-scroll). Un filet de progression se remplit au passage
 *    de la section dans le viewport.
 *
 * Mobile : la colonne gauche devient un en-tête compact au-dessus des tuiles
 * (pas de sticky deux-colonnes sur petit écran).
 *
 * Motion : uniquement les tokens de `@/lib/motion` et `m.*` (LazyMotion strict).
 * Le scroll-linked scaleX du filet est une valeur continue, pas une animation —
 * il reste donc visible même en `prefers-reduced-motion`.
 */

interface EventGroup {
	key: string;
	label: string;
	count: number;
	hooks: Hook[];
}

interface EventSectionsProps {
	groups: EventGroup[];
	/** Joue la révélation split-flap des noms (intro de chargement uniquement). */
	intro: boolean;
	introDelays: Map<string, number>;
}

const TYPE_INFO = HOOK_TYPE_INFO as Record<string, HookTypeInfo | undefined>;

/** Matchers dominants du groupe (par fréquence), limités à 4 — les chips « Leverages » du /eve. */
function dominantMatchers(hooks: Hook[]): string[] {
	const counts = new Map<string, number>();
	for (const h of hooks) {
		const t = h.trigger && h.trigger !== "*" ? h.trigger : "*";
		counts.set(t, (counts.get(t) ?? 0) + 1);
	}
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 4)
		.map(([t]) => t);
}

export function EventSections({
	groups,
	intro,
	introDelays,
}: EventSectionsProps) {
	return (
		<div data-component="EventSections" className="space-y-16 lg:space-y-24">
			{groups.map((grp, i) => (
				<EventSection
					key={grp.key}
					index={i + 1}
					grp={grp}
					intro={intro}
					introDelay={introDelays.get(`grp:${grp.key}`) ?? 0}
					introDelays={introDelays}
				/>
			))}
		</div>
	);
}

function EventSection({
	index,
	grp,
	intro,
	introDelay,
	introDelays,
}: {
	index: number;
	grp: EventGroup;
	intro: boolean;
	introDelay: number;
	introDelays: Map<string, number>;
}) {
	const T = useT();
	const ref = useRef<HTMLElement>(null);
	// Progression de la section dans le viewport : 0 quand elle entre, 1 quand
	// elle le quitte — le filet se remplit pendant la phase épinglée.
	const { scrollYProgress } = useScroll({
		target: ref,
		offset: ["start end", "end start"],
	});

	const info = TYPE_INFO[grp.key];
	const blurb = T.eventBlurb[grp.key] ?? T.eventGenericBlurb;
	const matchers = dominantMatchers(grp.hooks);

	return (
		<section
			ref={ref}
			data-component="EventSection"
			className="grid gap-5 lg:grid-cols-[minmax(0,290px)_minmax(0,1fr)] lg:gap-10"
		>
			{/* Colonne gauche sticky — explique l'événement */}
			<div className="lg:sticky lg:top-[138px] lg:self-start">
				<div className="flex items-baseline gap-3">
					<span
						aria-hidden
						className="select-none font-mono text-4xl font-bold tracking-tight text-white/10"
					>
						{String(index).padStart(2, "0")}
					</span>
					<span className="font-mono text-xs text-zinc-500">
						{grp.count} {T.eventHooks}
					</span>
				</div>

				<h3 className="mt-3 font-mono text-2xl font-semibold tracking-tight text-white">
					<SplitFlap text={grp.label} play={intro} delay={introDelay} block />
				</h3>

				{info && (
					<p className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
						<span
							aria-hidden
							className={`inline-block size-1.5 shrink-0 rounded-full ${
								info.blocking ? "bg-white/70" : "bg-zinc-600"
							}`}
						/>
						{info.label}
					</p>
				)}

				<p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-zinc-400">
					{blurb}
				</p>

				{matchers.length > 0 && (
					<div className="mt-4 flex flex-wrap gap-1.5">
						{matchers.map((t) => (
							<span
								key={t}
								className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 font-mono text-[11px] text-zinc-400"
							>
								{t}
							</span>
						))}
					</div>
				)}

				{/* Filet de progression — se remplit pendant que la section défile. */}
				<div
					aria-hidden
					className="mt-7 hidden h-px w-full max-w-[220px] overflow-hidden bg-white/10 lg:block"
				>
					<m.div
						style={{ scaleX: scrollYProgress }}
						className="h-full origin-left bg-white/50"
					/>
				</div>
			</div>

			{/* Tuiles des hooks associés */}
			<div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] items-start gap-3">
				{grp.hooks.map((h) => (
					<HookRow
						key={h.slug}
						hook={h}
						groupBy="event"
						intro={intro}
						introDelay={introDelays.get(h.slug) ?? 0}
					/>
				))}
			</div>
		</section>
	);
}
