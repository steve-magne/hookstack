"use client";

import { m } from "motion/react";
import { spring } from "@/lib/motion";

/**
 * AnimatedCheck — la coche qui se *dessine* (SVG pathLength 0→1).
 *
 * Réservée au geste central de l'app : sélectionner un hook. Le trait part
 * du coin et se trace en spring snappy ; à la désélection il se rétracte.
 * C'est le petit détail qui transforme une checkbox en moment satisfaisant.
 */
export function AnimatedCheck({
	checked,
	className = "size-3.5",
}: {
	checked: boolean;
	className?: string;
}) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={3}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<m.path
				d="M5 13l4 4L19 7"
				initial={false}
				animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
				transition={spring.snappy}
			/>
		</svg>
	);
}
