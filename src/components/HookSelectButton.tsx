"use client";

import { Check, Plus } from "lucide-react";
import { useT } from "@/lib/locale-context";
import { useSelection } from "@/store/selection";

export function HookSelectButton({ slug }: { slug: string }) {
	const selected = useSelection((s) => s.selected.includes(slug));
	const toggle = useSelection((s) => s.toggle);
	const T = useT();

	return (
		<button
			type="button"
			onClick={() => toggle(slug)}
			className={`mb-8 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ${
				selected
					? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
					: "bg-[var(--color-brand)] text-[var(--color-bg)] hover:bg-[var(--color-brand-2)]"
			}`}
		>
			{selected ? <Check className="size-4" /> : <Plus className="size-4" />}
			{selected ? T.addedToSelection : T.addToMyConfig}
		</button>
	);
}
