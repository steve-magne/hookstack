// timeline.ts — accès typé à la timeline d'évolution du catalogue.
//
// La donnée brute (registry/hooks-timeline.json) est générée par
// .claude/hooks-timeline.mjs depuis l'historique git (date de premier ajout de
// chaque .claude/hooks/*.mjs). Ce module la lit et en dérive les structures
// d'affichage : grille hebdomadaire (heatmap), série cumulée (courbe) et stats.
//
// La logique de découpe en semaines est le MIROIR exact de buildWeeks() côté
// générateur (même MIN_WEEKS, même ancrage dimanche, même padding « room to
// grow ») pour que le heatmap du site et le SVG du README racontent la même histoire.

import type { Category } from "@/types/hook";
import raw from "../../registry/hooks-timeline.json";

export interface TimelineHook {
	slug: string;
	name: string;
	category: Category;
	date: string;
}

export interface TimelineData {
	total: number;
	firstDate: string | null;
	lastDate: string | null;
	byDay: Record<string, number>;
	hooks: TimelineHook[];
}

export interface Cell {
	date: string;
	count: number;
	level: 0 | 1 | 2 | 3 | 4;
}

export const timeline = raw as TimelineData;

/** Doit rester identique à MIN_WEEKS dans .claude/hooks-timeline.mjs. */
export const MIN_WEEKS = 20;

/**
 * Rampe de luminance monochrome — du vide au blanc (la marque, --color-brand: #fff).
 * Reste fidèle au langage visuel strictement monochrome du site (DESIGN.md) :
 * l'intensité = la lumière, pas une teinte étrangère. Index = niveau 0..4.
 * Doit rester identique à LEVEL_COLORS dans .claude/hooks-timeline.mjs.
 */
export const LEVEL_COLORS = [
	"#1c1c20",
	"#3f3f46",
	"#71717a",
	"#a1a1aa",
	"#f4f4f5",
] as const;

export function bucketLevel(count: number): Cell["level"] {
	if (count <= 0) return 0;
	if (count <= 2) return 1;
	if (count <= 5) return 2;
	if (count <= 10) return 3;
	return 4;
}

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

/** Grille [semaine][jour 0..6] façon graphe de contribution. Miroir du générateur. */
export function buildWeeks(
	data: TimelineData = timeline,
	minWeeks = MIN_WEEKS,
): Cell[][] {
	if (!data.firstDate || !data.lastDate) return [];
	const first = new Date(`${data.firstDate}T00:00:00Z`);
	const last = new Date(`${data.lastDate}T00:00:00Z`);
	const start = addDays(first, -first.getUTCDay());
	let end = addDays(last, 6 - last.getUTCDay());
	const weekCount =
		Math.floor((end.getTime() - start.getTime()) / (7 * DAY)) + 1;
	if (weekCount < minWeeks) end = addDays(end, (minWeeks - weekCount) * 7);

	const weeks: Cell[][] = [];
	let cursor = start;
	while (cursor.getTime() <= end.getTime()) {
		const days: Cell[] = [];
		for (let i = 0; i < 7; i++) {
			const key = iso(cursor);
			const count = data.byDay[key] ?? 0;
			days.push({ date: key, count, level: bucketLevel(count) });
			cursor = addDays(cursor, 1);
		}
		weeks.push(days);
	}
	return weeks;
}

export interface CumulativePoint {
	date: string;
	added: number;
	cumulative: number;
}

/** Série cumulée sur les seuls jours d'activité — pour la courbe de croissance. */
export function cumulativeSeries(
	data: TimelineData = timeline,
): CumulativePoint[] {
	const days = Object.keys(data.byDay).sort();
	let running = 0;
	return days.map((date) => {
		const added = data.byDay[date];
		running += added;
		return { date, added, cumulative: running };
	});
}

/** Mois (libellés colonne) → index de semaine où le mois change. */
export function monthLabels(
	weeks: Cell[][],
): { label: string; weekIndex: number }[] {
	const MONTHS = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
	const out: { label: string; weekIndex: number }[] = [];
	let last = -1;
	weeks.forEach((week, i) => {
		const m = new Date(`${week[0].date}T00:00:00Z`).getUTCMonth();
		if (m !== last) {
			last = m;
			out.push({ label: MONTHS[m], weekIndex: i });
		}
	});
	return out;
}

/** Plus longue série de jours calendaires consécutifs avec ≥1 ajout. */
export function longestStreak(data: TimelineData = timeline): number {
	const days = Object.keys(data.byDay).sort();
	let best = 0;
	let run = 0;
	let prev: number | null = null;
	for (const d of days) {
		const t = new Date(`${d}T00:00:00Z`).getTime();
		run = prev !== null && t - prev === DAY ? run + 1 : 1;
		best = Math.max(best, run);
		prev = t;
	}
	return best;
}

export interface TimelineStats {
	total: number;
	firstDate: string | null;
	lastDate: string | null;
	activeDays: number;
	busiestCount: number;
	longestStreak: number;
}

export function timelineStats(data: TimelineData = timeline): TimelineStats {
	const counts = Object.values(data.byDay);
	return {
		total: data.total,
		firstDate: data.firstDate,
		lastDate: data.lastDate,
		activeDays: counts.length,
		busiestCount: counts.length ? Math.max(...counts) : 0,
		longestStreak: longestStreak(data),
	};
}

/** N derniers hooks ajoutés (date décroissante, nom en départage). */
export function recentHooks(
	n = 8,
	data: TimelineData = timeline,
): TimelineHook[] {
	return [...data.hooks]
		.sort((a, b) =>
			a.date === b.date
				? a.name.localeCompare(b.name)
				: b.date.localeCompare(a.date),
		)
		.slice(0, n);
}
