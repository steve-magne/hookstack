"use client";

import { Check, Copy } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { spring } from "@/lib/motion";

/**
 * CopySwap — l'icône Copy↔Check, animée une seule fois pour tout le site.
 *
 * Remplace les swaps secs (les 3 boutons « Copier »). L'icône sortante
 * tourne et rétrécit, l'entrante arrive en sens inverse : le geste « c'est
 * copié » devient lisible sans être bruyant. mode="wait" garantit qu'une
 * icône a fini de sortir avant que l'autre entre.
 */
export function CopySwap({
	copied,
	className = "size-3.5",
}: {
	copied: boolean;
	className?: string;
}) {
	return (
		<span
			className="relative inline-flex"
			style={{ width: "1em", height: "1em" }}
		>
			<AnimatePresence mode="wait" initial={false}>
				<m.span
					key={copied ? "check" : "copy"}
					initial={{ opacity: 0, scale: 0.5, rotate: copied ? -90 : 90 }}
					animate={{ opacity: 1, scale: 1, rotate: 0 }}
					exit={{ opacity: 0, scale: 0.5, rotate: copied ? 90 : -90 }}
					transition={spring.snappy}
					className="absolute inset-0 inline-flex items-center justify-center"
				>
					{copied ? (
						<Check className={className} />
					) : (
						<Copy className={className} />
					)}
				</m.span>
			</AnimatePresence>
		</span>
	);
}
