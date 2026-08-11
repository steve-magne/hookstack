"use client";

import { m, useScroll } from "motion/react";
import { useRef } from "react";
import { useT } from "@/lib/locale-context";
import { HOOK_TYPE_INFO, type Hook, type HookTypeInfo } from "@/types/hook";
import { HookRow } from "./HookRow";
import { SplitFlap } from "./SplitFlap";

/**
 * EventSections — le catalogue en sections deux colonnes façon Vercel /eve.
 *
 * Utilisé par les trois modes de groupage (« Event », « Category »,
 * « Recently added ») — parité visuelle :
 *  - à gauche, une colonne **sticky** qui explique le groupe (numéro, nom
 *    mono, sous-ligne, blurb, valeurs dominantes) ;
 *  - à droite, les **tuiles des hooks associés** qui défilent sous la colonne
 *    épinglée (pin-and-scroll). Un filet de progression se remplit au passage
 *    de la section dans le viewport.
 *
 * Mode `event` : sous-ligne = cycle de vie (`HOOK_TYPE_INFO`), chips =
 * matchers dominants. Mode `category` : sous-ligne = nombre d'event types,
 * chips = event types dominants du groupe. Mode `date` : sous-ligne = fenêtre
 * de récence, blurb dédié, chips = event types dominants. Structure identique
 * dans les trois modes — seule la sémantique de la colonne gauche change.
 *
 * Mobile : la colonne gauche devient un en-tête compact au-dessus des tuiles
 * (pas de sticky deux-colonnes sur petit écran).
 *
 * Motion : uniquement les tokens de `@/lib/motion` et `m.*` (LazyMotion strict).
 * Le scroll-linked scaleX du filet est une valeur continue, pas une animation —
 * il reste donc visible même en `prefers-reduced-motion`.
 */

/** Modes de groupage qui utilisent les sections deux colonnes. */
export type SectionsMode = "event" | "category" | "date";

interface Group {
	key: string;
	label: string;
	count: number;
	hooks: Hook[];
}

interface EventSectionsProps {
	groups: Group[];
	mode: SectionsMode;
	/** Joue la révélation split-flap des noms (intro de chargement uniquement). */
	intro: boolean;
	introDelays: Map<string, number>;
}

const TYPE_INFO = HOOK_TYPE_INFO as Record<string, HookTypeInfo | undefined>;

/** Valeurs dominantes du groupe (par fréquence), limitées à 4 — les chips de la colonne gauche. */
function dominantValues(hooks: Hook[], key: "trigger" | "hook_type"): string[] {
	const counts = new Map<string, number>();
	for (const h of hooks) {
		const v =
			key === "trigger"
				? h.trigger && h.trigger !== "*"
					? h.trigger
					: "*"
				: h.hook_type;
		counts.set(v, (counts.get(v) ?? 0) + 1);
	}
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 4)
		.map(([v]) => v);
}

export function EventSections({
	groups,
	mode,
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
					mode={mode}
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
	mode,
	intro,
	introDelay,
	introDelays,
}: {
	index: number;
	grp: Group;
	mode: SectionsMode;
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

	// Colonne gauche — contenu adapté au mode, structure identique.
	const isCategory = mode === "category";
	const isDate = mode === "date";
	const info = TYPE_INFO[grp.key];
	const blurb = isCategory
		? (T.categoryBlurb[grp.key] ?? T.categoryGenericBlurb)
		: isDate
			? (T.dateBlurb[grp.key] ?? T.dateGenericBlurb)
			: (T.eventBlurb[grp.key] ?? T.eventGenericBlurb);
	const chips =
		isCategory || isDate
			? dominantValues(grp.hooks, "hook_type")
			: dominantValues(grp.hooks, "trigger");
	const eventTypeCount = new Set(grp.hooks.map((h) => h.hook_type)).size;

	return (
		<section
			ref={ref}
			data-component="EventSection"
			className="grid gap-5 lg:grid-cols-[minmax(0,290px)_minmax(0,1fr)] lg:gap-10"
		>
			{/* Colonne gauche sticky — explique le groupe */}
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

				{isCategory || isDate ? (
					<p className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
						<span
							aria-hidden
							className="inline-block size-1.5 shrink-0 rounded-full bg-zinc-600"
						/>
						{isDate
							? (T.dateWindowSub[grp.key] ?? T.dateGenericSub)
							: `${eventTypeCount} ${T.eventTypesLabel}`}
					</p>
				) : (
					info && (
						<p className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
							<span
								aria-hidden
								className={`inline-block size-1.5 shrink-0 rounded-full ${
									info.blocking ? "bg-white/70" : "bg-zinc-600"
								}`}
							/>
							{info.label}
						</p>
					)
				)}

				<p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-zinc-400">
					{blurb}
				</p>

				{chips.length > 0 && (
					<div className="mt-4 flex flex-wrap gap-1.5">
						{chips.map((t) => (
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
						groupBy={mode}
						intro={intro}
						introDelay={introDelays.get(h.slug) ?? 0}
					/>
				))}
			</div>
		</section>
	);
}
