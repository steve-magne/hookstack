import { describe, expect, it } from "vitest";
import {
	bucketLevel,
	buildWeeks,
	cumulativeSeries,
	LEVEL_COLORS,
	longestStreak,
	MIN_WEEKS,
	monthLabels,
	recentHooks,
	type TimelineData,
	timelineStats,
} from "@/lib/timeline";

// Fixture déterministe — miroir de la forme produite par .claude/hooks-timeline.mjs.
const DATA: TimelineData = {
	total: 5,
	firstDate: "2026-05-29",
	lastDate: "2026-06-02",
	byDay: { "2026-05-29": 2, "2026-05-30": 1, "2026-06-01": 1, "2026-06-02": 1 },
	hooks: [
		{ slug: "a", name: "Alpha", category: "security", date: "2026-05-29" },
		{ slug: "b", name: "Bravo", category: "context", date: "2026-05-29" },
		{ slug: "c", name: "Charlie", category: "workflow", date: "2026-05-30" },
		{ slug: "d", name: "Delta", category: "validation", date: "2026-06-01" },
		{ slug: "e", name: "Echo", category: "documentation", date: "2026-06-02" },
	],
};

const EMPTY: TimelineData = {
	total: 0,
	firstDate: null,
	lastDate: null,
	byDay: {},
	hooks: [],
};

describe("bucketLevel", () => {
	it("maps counts to GitHub-like intensity levels", () => {
		expect([0, 1, 2, 5, 10, 28].map(bucketLevel)).toEqual([0, 1, 1, 2, 3, 4]);
	});

	it("indexes a defined colour in the monochrome ramp", () => {
		expect(LEVEL_COLORS).toHaveLength(5);
		expect(LEVEL_COLORS[bucketLevel(28)]).toBe("#f4f4f5");
		expect(LEVEL_COLORS[bucketLevel(0)]).toBe("#1c1c20");
	});
});

describe("buildWeeks", () => {
	it("produces 7-day columns starting on Sunday and carries counts", () => {
		const weeks = buildWeeks(DATA, 1);
		expect(weeks.every((w) => w.length === 7)).toBe(true);
		expect(new Date(`${weeks[0][0].date}T00:00:00Z`).getUTCDay()).toBe(0);
		const may29 = weeks.flat().find((d) => d.date === "2026-05-29");
		expect(may29).toMatchObject({ count: 2, level: 1 });
	});

	it("pads forward to guarantee a minimum width (room to grow)", () => {
		expect(buildWeeks(DATA).length).toBe(MIN_WEEKS);
		expect(buildWeeks(DATA, 12).length).toBe(12);
	});

	it("returns no weeks for an empty timeline", () => {
		expect(buildWeeks(EMPTY)).toEqual([]);
	});
});

describe("cumulativeSeries", () => {
	it("accumulates additions over the active days, in order", () => {
		expect(cumulativeSeries(DATA)).toEqual([
			{ date: "2026-05-29", added: 2, cumulative: 2 },
			{ date: "2026-05-30", added: 1, cumulative: 3 },
			{ date: "2026-06-01", added: 1, cumulative: 4 },
			{ date: "2026-06-02", added: 1, cumulative: 5 },
		]);
	});

	it("is empty when there is no activity", () => {
		expect(cumulativeSeries(EMPTY)).toEqual([]);
	});
});

describe("monthLabels", () => {
	it("emits one label per month change, at the week where it starts", () => {
		const labels = monthLabels(buildWeeks(DATA, 3));
		expect(labels[0]).toMatchObject({ label: "May", weekIndex: 0 });
		expect(labels.some((l) => l.label === "Jun")).toBe(true);
	});
});

describe("longestStreak", () => {
	it("counts the longest run of consecutive calendar days", () => {
		// 05-29, 05-30 consécutifs (2), trou le 05-31, puis 06-01, 06-02 (2) → 2
		expect(longestStreak(DATA)).toBe(2);
	});

	it("is 0 with no activity", () => {
		expect(longestStreak(EMPTY)).toBe(0);
	});
});

describe("timelineStats", () => {
	it("summarises total, span, active days, busiest day and streak", () => {
		expect(timelineStats(DATA)).toEqual({
			total: 5,
			firstDate: "2026-05-29",
			lastDate: "2026-06-02",
			activeDays: 4,
			busiestCount: 2,
			longestStreak: 2,
		});
	});

	it("handles an empty timeline without throwing", () => {
		expect(timelineStats(EMPTY)).toMatchObject({
			total: 0,
			activeDays: 0,
			busiestCount: 0,
			longestStreak: 0,
		});
	});
});

describe("recentHooks", () => {
	it("returns the latest hooks, newest first, name breaking ties", () => {
		const recent = recentHooks(3, DATA);
		expect(recent.map((h) => h.slug)).toEqual(["e", "d", "c"]);
	});

	it("breaks same-date ties alphabetically", () => {
		const recent = recentHooks(8, DATA);
		const sameDay = recent
			.filter((h) => h.date === "2026-05-29")
			.map((h) => h.name);
		expect(sameDay).toEqual(["Alpha", "Bravo"]);
	});
});
