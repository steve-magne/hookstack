import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { track } from "@/lib/analytics";
import { allHooks } from "@/lib/hooks";

/**
 * Émet select_hook / deselect_hook vers GA4 à chaque mouvement de panier.
 * Enrichi avec les métadonnées du hook (lookup registre) pour segmenter dans GA
 * par catégorie / événement — sans alourdir l'appelant. `source` reste générique
 * ici (toutes les surfaces convergent vers le store) ; l'attribution fine vit
 * dans les événements à plus forte valeur (copie, fiche).
 */
function trackSelection(slug: string, action: "select_hook" | "deselect_hook") {
	const hook = allHooks.find((h) => h.slug === slug);
	track(action, {
		hook_slug: slug,
		hook_name: hook?.name ?? slug,
		hook_category: hook?.category ?? "unknown",
		hook_event: hook?.hook_type ?? "unknown",
	});
}

interface SelectionState {
	selected: string[];
	defaultInitialized: boolean;
	seenDefaultSlugs: string[];
	// Non-persisté — repart à false à chaque nouvelle session
	sessionTouched: boolean;
	toggle: (slug: string) => void;
	add: (slug: string) => void;
	remove: (slug: string) => void;
	clear: () => void;
	has: (slug: string) => boolean;
	initDefaults: (slugs: string[]) => void;
}

export const useSelection = create<SelectionState>()(
	persist(
		(set, get) => ({
			selected: [],
			defaultInitialized: false,
			seenDefaultSlugs: [],
			sessionTouched: false,
			toggle: (slug) =>
				set((s) => {
					const isSelected = s.selected.includes(slug);
					trackSelection(slug, isSelected ? "deselect_hook" : "select_hook");
					return {
						sessionTouched: true,
						selected: isSelected
							? s.selected.filter((x) => x !== slug)
							: [...s.selected, slug],
					};
				}),
			add: (slug) =>
				set((s) => {
					if (s.selected.includes(slug)) return s;
					trackSelection(slug, "select_hook");
					return { sessionTouched: true, selected: [...s.selected, slug] };
				}),
			remove: (slug) =>
				set((s) => {
					if (!s.selected.includes(slug)) return s;
					trackSelection(slug, "deselect_hook");
					return {
						sessionTouched: true,
						selected: s.selected.filter((x) => x !== slug),
					};
				}),
			clear: () =>
				set({
					selected: [],
					defaultInitialized: false,
					seenDefaultSlugs: [],
					sessionTouched: false,
				}),
			has: (slug) => get().selected.includes(slug),
			initDefaults: (slugs) =>
				set((s) => {
					// Garantit que TOUS les hooks default_on sont dans selected (pas seulement les nouveaux).
					// seenDefaultSlugs reste pour détecter les ajouts au registre, mais toAdd couvre
					// aussi les hooks vus dans une session précédente qui auraient été désélectionnés.
					const newSlugs = slugs.filter(
						(sl) => !s.seenDefaultSlugs.includes(sl),
					);
					const toAdd = slugs.filter((sl) => !s.selected.includes(sl));
					if (
						toAdd.length === 0 &&
						newSlugs.length === 0 &&
						s.defaultInitialized
					)
						return s;
					return {
						defaultInitialized: true,
						seenDefaultSlugs: slugs,
						selected: [...s.selected, ...toAdd],
						// sessionTouched inchangé — initDefaults n'est pas une action utilisateur
					};
				}),
		}),
		{
			name: "claudehooks-selection",
			storage: createJSONStorage(() =>
				typeof window !== "undefined"
					? localStorage
					: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
			),
			// sessionTouched exclu de la persistance → repart toujours à false au chargement
			partialize: (state) => ({
				selected: state.selected,
				defaultInitialized: state.defaultInitialized,
				seenDefaultSlugs: state.seenDefaultSlugs,
			}),
		},
	),
);
