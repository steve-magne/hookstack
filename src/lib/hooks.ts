import type { Category, Hook, HookType, Stack } from "@/types/hook";
import registry from "../../registry/registry.json";

export const allHooks = registry as Hook[];

export function getHookBySlug(slug: string): Hook | undefined {
	return allHooks.find((h) => h.slug === slug);
}

export interface HookFilters {
	query: string;
	categories: Category[];
	events: HookType[];
	stacks: Stack[];
	tags: string[];
}

export const emptyFilters: HookFilters = {
	query: "",
	categories: [],
	events: [],
	stacks: [],
	tags: [],
};

export function filterHooks(hooks: Hook[], filters: HookFilters): Hook[] {
	const q = filters.query.trim().toLowerCase();
	return hooks.filter((h) => {
		if (filters.categories.length && !filters.categories.includes(h.category))
			return false;
		if (filters.events.length && !filters.events.includes(h.hook_type))
			return false;
		// Thematic filter (OR): a hook matches if it carries at least one of
		// the selected tags. Multiple themes widen the net.
		if (filters.tags.length && !h.tags.some((t) => filters.tags.includes(t)))
			return false;
		// Stack filter: universal hooks (no stack) always pass; tech-specific hooks
		// are only shown when their stack overlaps with the selection.
		if (filters.stacks.length && h.stack?.length) {
			if (!h.stack.some((s) => filters.stacks.includes(s))) return false;
		}
		if (q) {
			const haystack = [
				h.name,
				h.benefit ?? "",
				h.description,
				h.hook_type,
				h.trigger,
				...h.tags,
				...h.use_cases,
			]
				.join(" ")
				.toLowerCase();
			if (!haystack.includes(q)) return false;
		}
		return true;
	});
}
