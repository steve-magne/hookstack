export type Locale = 'fr' | 'en'

export interface Translations {
  metaTitle: string
  metaDescription: string
  footerText: string
  navCatalogue: string
  navContribute: string
  hooksSelectedOne: string
  hooksSelectedMany: string
  signInTitle: string
  signInTitleDisabled: string
  signIn: string
  heroTitle1: string
  heroHighlight: string
  heroTitle2: string
  catalogueTitle: string
  noResults: string
  searchPlaceholder: string
  filterCategory: string
  filterProvider: string
  filterEvent: string
  groupByEvent: string
  groupByCategory: string
  viewFullPage: string
  close: string
  reset: string
  removeFromSelection: string
  addToSelection: string
  selectHooksPrompt: string
  generatedConfig: string
  copied: string
  copy: string
  scriptsToCreate: string
  makeExecutable: string
  installScript: string
  installScriptCopied: string
  hookNotFound: string
  backToCatalogue: string
  useCases: string
  providersAndTags: string
  settingsFragment: string
  addedToSelection: string
  addToMyConfig: string
  contributeTitle: string
  contributeSubtitle: string
  contributeSteps: string[]
  contributeFormLabel: string
  contributeSubmitBtn: string
  contributeError: string
  contributeSuccessText: string
  contributeIssueLink: string
  contributeNote: string
  categoryLabels: Record<string, string>
}

const fr: Translations = {
  metaTitle: 'Hookit — Catalogue de hooks agentiques',
  metaDescription: 'Catalogue communautaire de hooks pour Claude Code & GitHub Copilot',
  footerText: 'Hookit — POC v0.1 · Catalogue communautaire de hooks agentiques',
  navCatalogue: 'Catalogue',
  navContribute: 'Contribuer',
  hooksSelectedOne: 'hook sélectionné',
  hooksSelectedMany: 'hooks sélectionnés',
  signInTitle: 'Se connecter avec GitHub',
  signInTitleDisabled: "Configurer Supabase pour activer l'auth GitHub",
  signIn: 'Connexion',
  heroTitle1: 'Implémente tes',
  heroHighlight: 'hooks agentiques',
  heroTitle2: 'en 2 minutes',
  catalogueTitle: 'Catalogue de hooks',
  noResults: 'Aucun hook ne correspond à ces filtres.',
  searchPlaceholder: "Rechercher un hook, un cas d'usage, un tag…",
  filterCategory: 'Catégorie',
  filterProvider: 'Provider',
  filterEvent: 'Event',
  groupByEvent: "Par type d'event",
  groupByCategory: 'Par catégorie',
  viewFullPage: 'Voir la page complète',
  close: 'Fermer',
  reset: 'Réinitialiser',
  removeFromSelection: 'Retirer de la sélection',
  addToSelection: 'Ajouter à la sélection',
  selectHooksPrompt: 'Sélectionne des hooks (bouton +) pour générer ta configuration settings.json.',
  generatedConfig: 'Configuration générée',
  copied: 'Copié',
  copy: 'Copier',
  scriptsToCreate: 'Scripts à créer',
  makeExecutable: 'Pense à rendre les scripts exécutables :',
  installScript: "Script d'installation",
  installScriptCopied: 'Script copié',
  hookNotFound: 'Hook introuvable.',
  backToCatalogue: 'Retour au catalogue',
  useCases: "Cas d'usage",
  providersAndTags: 'Providers & tags',
  settingsFragment: 'Fragment settings.json',
  addedToSelection: 'Ajouté à la sélection',
  addToMyConfig: 'Ajouter à ma config',
  contributeTitle: 'Contribuer un dépôt',
  contributeSubtitle:
    "Partage un dépôt GitHub public qui utilise des hooks agentiques. Un agent Claude Code l'analyse, détecte les patterns non recensés et ouvre une PR pour enrichir le registre.",
  contributeSteps: [
    "Saisis l'URL de ton dépôt GitHub public.",
    'Une issue de soumission est préparée sur le dépôt du registre.',
    "Une GitHub Action clone le dépôt et lance l'analyse Claude Code.",
    'Les nouveaux hooks détectés arrivent en PR (label auto-generated).',
  ],
  contributeFormLabel: 'URL de ton dépôt GitHub public',
  contributeSubmitBtn: 'Préparer la soumission',
  contributeError: 'Entre une URL de dépôt GitHub public valide (https://github.com/org/repo).',
  contributeSuccessText:
    "Ta soumission est prête. Ouvre l'issue pré-remplie pour déclencher l'analyse automatique du dépôt :",
  contributeIssueLink: "Créer l'issue de soumission",
  contributeNote:
    'Une GitHub Action labellisée repo-submission clonera le dépôt, détectera les hooks et ouvrira une PR sur le registre.',
  categoryLabels: {
    security: 'Sécurité',
    context: 'Contexte',
    validation: 'Validation',
    notification: 'Notification',
    workflow: 'Workflow',
    documentation: 'Documentation',
  },
}

const en: Translations = {
  metaTitle: 'Hookit — Agentic hooks catalogue',
  metaDescription: 'Community catalogue of hooks for Claude Code & GitHub Copilot',
  footerText: 'Hookit — POC v0.1 · Community catalogue of agentic hooks',
  navCatalogue: 'Catalogue',
  navContribute: 'Contribute',
  hooksSelectedOne: 'hook selected',
  hooksSelectedMany: 'hooks selected',
  signInTitle: 'Sign in with GitHub',
  signInTitleDisabled: 'Configure Supabase to enable GitHub auth',
  signIn: 'Sign in',
  heroTitle1: 'Implement your',
  heroHighlight: 'agentic hooks',
  heroTitle2: 'in 2 minutes',
  catalogueTitle: 'Hooks catalogue',
  noResults: 'No hook matches these filters.',
  searchPlaceholder: 'Search for a hook, use case, tag…',
  filterCategory: 'Category',
  filterProvider: 'Provider',
  filterEvent: 'Event',
  groupByEvent: 'By event type',
  groupByCategory: 'By category',
  viewFullPage: 'View full page',
  close: 'Close',
  reset: 'Reset',
  removeFromSelection: 'Remove from selection',
  addToSelection: 'Add to selection',
  selectHooksPrompt: 'Select hooks (+ button) to generate your settings.json configuration.',
  generatedConfig: 'Generated configuration',
  copied: 'Copied',
  copy: 'Copy',
  scriptsToCreate: 'Scripts to create',
  makeExecutable: 'Remember to make scripts executable:',
  installScript: 'Install script',
  installScriptCopied: 'Script copied',
  hookNotFound: 'Hook not found.',
  backToCatalogue: 'Back to catalogue',
  useCases: 'Use cases',
  providersAndTags: 'Providers & tags',
  settingsFragment: 'settings.json fragment',
  addedToSelection: 'Added to selection',
  addToMyConfig: 'Add to my config',
  contributeTitle: 'Contribute a repository',
  contributeSubtitle:
    'Share a public GitHub repository that uses agentic hooks. A Claude Code agent analyzes it, detects unlisted patterns and opens a PR to enrich the registry.',
  contributeSteps: [
    'Enter your public GitHub repository URL.',
    'A submission issue is prepared on the registry repository.',
    'A GitHub Action clones the repository and runs Claude Code analysis.',
    'Newly detected hooks arrive as a PR (auto-generated label).',
  ],
  contributeFormLabel: 'Your public GitHub repository URL',
  contributeSubmitBtn: 'Prepare submission',
  contributeError: 'Enter a valid public GitHub repository URL (https://github.com/org/repo).',
  contributeSuccessText:
    'Your submission is ready. Open the pre-filled issue to trigger the automatic repository analysis:',
  contributeIssueLink: 'Create submission issue',
  contributeNote:
    'A GitHub Action labeled repo-submission will clone the repository, detect hooks and open a PR on the registry.',
  categoryLabels: {
    security: 'Security',
    context: 'Context',
    validation: 'Validation',
    notification: 'Notification',
    workflow: 'Workflow',
    documentation: 'Documentation',
  },
}

export const translations: Record<Locale, Translations> = { fr, en }

export function getT(locale: Locale): Translations {
  return translations[locale] ?? translations.fr
}
