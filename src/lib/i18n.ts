export const SEO_KEYWORDS = [
  'Claude Code hooks',
  'agentic hooks',
  'agentic workflow',
  'vibe coding',
  'GitHub Copilot hooks',
  'deterministic behavior',
  'HookStack',
  'Claude Code',
  'agentic hook',
  'AI coding hooks',
  'PreToolUse',
  'PostToolUse',
  'AI development workflow',
  'coding automation',
  'Claude Code extensions',
]

export const T = {
  metaTitle: 'HookStack — Agentic Hooks for Claude Code & Vibe Coding',
  metaDescription:
    'Catalogue of agentic hooks for Claude Code & GitHub Copilot. Add deterministic behavior to your vibe coding workflow. Install in one npx command.',
  footerText: 'Hookstack — Community catalogue of agentic hooks',
  navCatalogue: 'Catalogue',
  hooksSelectedOne: 'hook selected',
  hooksSelectedMany: 'hooks selected',
  heroTitle1: 'Get your',
  heroHighlight: 'HookStack',
  heroTitle2: 'in 1 minute',
  heroTitleA: 'Ship fast.',
  heroTitleB: 'Break nothing.',
  // Second hero line — rotates every ~30s. Each slogan keeps the "X nothing."
  // beat of the original and maps to a real catalogue category (the proof the
  // stack delivers it). Order = first impression first. See HeroRotatingTitle.
  heroRotating: [
    'Break nothing.', // overall safety — the anchor
    'Leak nothing.', // security · catch a leaked key before it runs
    'Skip no test.', // validation · no source ships without a test
    'Forget nothing.', // context · conventions survive a compaction
    'Miss nothing.', // notification · told the moment work is done
    'Touch no main.', // workflow · edits blocked on main until you branch
  ] as const,
  heroSubtitleMain: 'Install a production-ready Claude Code HookStack in one command',
  heroSubtitleSub: 'or fine-tune it hook by hook',
  howItWorksTitle: 'Up and running in 60 seconds',
  howItWorksSteps: [
    {
      step: '01',
      title: 'Browse',
      desc: 'Filter hooks by event type, category, or your stack.',
    },
    {
      step: '02',
      title: 'Select',
      desc: 'Your install command updates live as you pick.',
    },
    {
      step: '03',
      title: 'Install',
      desc: 'Paste the npx command in your project root. Done.',
    },
  ] as const,
  githubLinkLabel: 'GitHub',
  installTerminalLabel: 'project root',
  installPlaceholder: 'pick your hooks below',
  installCaption: 'Will writes the hooks into .claude/hooks and patches settings.json — nothing else.',
  mobileCopyBtn: 'Copy and Paste to Claude Code App',
  catalogueTitle: 'Hooks catalogue',
  noResults: 'No hook matches these filters.',
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
  tags: 'Tags',
  settingsFragment: 'settings.json fragment',
  addedToSelection: 'Added to selection',
  addToMyConfig: 'Add to my config',
  categoryLabels: {
    security: 'Security',
    context: 'Context',
    validation: 'Validation',
    notification: 'Notification',
    workflow: 'Workflow',
    documentation: 'Documentation',
  },
  filterStack: 'Your stack',
  stackFilterHint: 'Universal hooks always show — pick a stack to add the rest.',
  stackFilterAll: 'Showing every hook',
  stackFilterReset: 'Clear',
  filterHideSelected: 'Hide selected',
  mustBannerTitle: 'Recommended standard',
  mustBannerSubtitle: 'essential hooks · already selected',
  mustInstallBtn: 'View configuration',
  mustPreselected: 'Essential',
  pluginInstallHint: 'Run once in your project root:',
  previewClickToAdd: 'Click the row to add it',
  previewMustHint: 'Recommended — already selected',
  navGuides: 'Guides',
  navAbout: 'About',
  guidesLinkText: 'Read the guides',
  compareTitle: 'Hooks vs slash-commands vs prompt instructions',
  compareIntro: 'Three ways to steer Claude Code — only one is guaranteed to run on every action.',
  compareCols: ['', 'Agentic hooks', 'Slash-commands', 'Prompt instructions'],
  compareRows: [
    { dim: 'How it runs', hook: 'Node.js script, outside the model', cmd: 'You type it; the model interprets', prompt: 'Text the model may follow' },
    { dim: 'Deterministic?', hook: 'Yes — fires unconditionally', cmd: 'No — the model decides', prompt: 'No — probabilistic' },
    { dim: 'Can it be skipped?', hook: 'No', cmd: 'Yes', prompt: 'Yes' },
    { dim: 'Token cost', hook: 'Zero (separate process)', cmd: 'Consumes context', prompt: 'Consumes context' },
    { dim: 'Best for', hook: 'Guardrails, gates, automation', cmd: 'On-demand interactive tasks', prompt: 'Soft guidance & style' },
  ],
  faqTitle: 'Frequently asked questions',
  faq: [
    {
      q: 'What is an agentic hook?',
      a: 'An agentic hook is a Node.js script triggered by Claude Code lifecycle events — PreToolUse, PostToolUse, SessionStart, Stop. Hooks enforce deterministic behavior in agentic workflows: block dangerous commands, run tests automatically, inject context, and notify your team — without relying on the LLM to remember.',
    },
    {
      q: 'How do agentic hooks improve vibe coding?',
      a: 'Vibe coding lets an AI agent like Claude Code drive most of your implementation while you set direction. Hooks add CI-like guardrails that fire on every agent action — making your agentic workflow production-safe, auditable, and repeatable regardless of what the model decides to do.',
    },
    {
      q: 'Does HookStack work with GitHub Copilot?',
      a: 'HookStack is built around Claude Code hooks today. The agentic hook patterns are portable: any AI coding agent that exposes lifecycle events can adopt the same deterministic-behavior approach. GitHub Copilot Workspace and similar tools are natural targets as they mature.',
    },
    {
      q: 'Why are Claude Code hooks better than prompt instructions?',
      a: 'Prompts are probabilistic — the model may or may not follow them. Claude Code hooks are deterministic Node.js scripts that execute unconditionally on matching events. No drift, no hallucination, no forgotten rules. That guarantee is what makes agentic workflows trustworthy in production.',
    },
    {
      q: 'How do I install Claude Code hooks with HookStack?',
      a: 'Browse the catalogue, select the hooks you want, then run the generated npx hookstack-cli@latest install command in your project root. HookStack writes the scripts to .claude/hooks/ and patches your settings.json — nothing else touched.',
    },
    {
      q: "I already use Claude Code commands like /gen-test-unit or /create-worktree — aren't hooks the same thing?",
      a: "Commands are interactive: you type them, Claude reads and acts on them inside the conversation. Hooks are the opposite — Node.js scripts that fire unconditionally outside the model, triggered by lifecycle events (PreToolUse, PostToolUse, Stop…). The model never sees them, never decides whether to run them, and can't skip them. Commands steer the AI; hooks constrain it.",
    },
    {
      q: 'Do hooks consume tokens from my context window?',
      a: 'No. Hooks run in a separate process, outside the model entirely. They can inject context back into the session via stdout, but the hook scripts themselves — and whatever they compute — are never sent to the model unless you explicitly return a message. Commands, on the other hand, are part of the conversation and consume context. Hooks are a zero-cost enforcement layer.',
    },
  ] as const,
}

export type Translations = typeof T
