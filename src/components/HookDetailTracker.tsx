"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/**
 * Émet `view_hook_detail` au montage de la page /hook/[slug].
 * GA4 trace déjà le page_view brut ; cet événement l'enrichit avec la catégorie
 * et l'événement du hook → permet de segmenter « quelles familles de hooks
 * attirent le plus de vues fiche » sans croiser manuellement les URLs.
 */
export function HookDetailTracker({
	slug,
	name,
	category,
	event,
}: {
	slug: string;
	name: string;
	category: string;
	event: string;
}) {
	useEffect(() => {
		track("view_hook_detail", {
			hook_slug: slug,
			hook_name: name,
			hook_category: category,
			hook_event: event,
			source: "detail_page",
		});
	}, [slug, name, category, event]);

	return null;
}
