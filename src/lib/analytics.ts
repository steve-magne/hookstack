/**
 * analytics.ts — couche unique d'envoi d'événements vers Google Analytics 4.
 *
 * Toute mesure passe par `track()`. Aucun composant n'appelle `window.gtag`
 * directement : un seul point de vérité pour le nommage (snake_case GA4), le
 * typage des paramètres et la garde SSR.
 *
 * Taxonomie pensée « agence de marketing numérique » :
 *
 *  ── Conversion (key event à marquer comme tel dans GA4) ──────────────────
 *  • copy_install_command   LE livrable du site : l'utilisateur copie la
 *                           commande `npx hookstack-cli install`. C'est l'achat.
 *
 *  ── Micro-conversions / intention ────────────────────────────────────────
 *  • select_hook / deselect_hook   construction du panier (engagement profond)
 *  • copy_settings_fragment        copie du JSON brut (intention avancée)
 *  • view_hook_detail              ouverture d'une fiche (intérêt produit)
 *  • view_full_page                passage modale → page dédiée
 *
 *  ── Découverte / comportement de navigation ──────────────────────────────
 *  • filter_stack / reset_stack_filter   segmentation par techno
 *  • toggle_grouping                     préférence d'exploration
 *
 *  ── Acquisition / sortie ──────────────────────────────────────────────────
 *  Les clics sortants (GitHub header / FAB / liens) ne sont PAS mesurés ici :
 *  l'« Enhanced Measurement » de GA4 les capture nativement (événement `click`
 *  avec `link_domain` / `link_url`). Rien à instrumenter côté code.
 */

type GtagParams = Record<string, string | number | boolean | undefined>;

declare global {
	interface Window {
		gtag?: (command: "event", eventName: string, params?: GtagParams) => void;
	}
}

/** Liste fermée des événements — garde-fou contre les typos et la dérive. */
export type AnalyticsEvent =
	| "copy_install_command"
	| "select_hook"
	| "deselect_hook"
	| "copy_settings_fragment"
	| "view_hook_detail"
	| "view_full_page"
	| "filter_stack"
	| "filter_category"
	| "filter_event"
	| "filter_tag"
	| "reset_stack_filter"
	| "reset_all_filters"
	| "toggle_grouping";

/**
 * Envoie un événement à GA4. No-op silencieux côté serveur ou si gtag n'est pas
 * encore chargé (bloqueur de pub, script async non résolu) — jamais d'erreur
 * runtime côté utilisateur.
 */
export function track(event: AnalyticsEvent, params: GtagParams = {}): void {
	if (typeof window === "undefined" || typeof window.gtag !== "function")
		return;
	window.gtag("event", event, params);
}
