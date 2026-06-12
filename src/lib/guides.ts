// Long-form guides — original, in-depth content that targets informational
// queries ("what are Claude Code hooks", "PreToolUse vs PostToolUse") and builds
// topical authority. Rendered by /guides and /guides/[slug] with Article + FAQ
// + Breadcrumb schema. Each guide cites the official docs and links related hooks
// (internal linking + source citation = SEO + GEO).

export type GuideBlock =
  | string // a paragraph
  | { list: string[] } // a bulleted list
  | { code: string } // a fenced code block

export interface GuideSection {
  // Question-phrased where natural (AEO / People-Also-Ask).
  heading: string
  body: GuideBlock[]
}

export interface GuideFaq {
  q: string
  a: string
}

export interface GuideSource {
  label: string
  url: string
}

export interface Guide {
  slug: string
  title: string
  // <title> / meta description.
  metaTitle: string
  description: string
  datePublished: string
  dateModified: string
  readingMinutes: number
  // Lead paragraphs shown under the H1 and used as the article summary.
  intro: string[]
  sections: GuideSection[]
  faq: GuideFaq[]
  relatedHookSlugs: string[]
  sources: GuideSource[]
}

const DOCS = 'https://docs.claude.com/en/docs/claude-code/hooks'

export const guides: Guide[] = [
  {
    slug: 'what-are-claude-code-hooks',
    title: 'What Are Claude Code Hooks? A Practical Guide',
    metaTitle: 'What Are Claude Code Hooks? A Practical Guide',
    description:
      'Claude Code hooks are scripts that run automatically at lifecycle events to enforce deterministic behavior. Learn what they are, how the lifecycle works, and how to install your first hook.',
    datePublished: '2026-06-12',
    dateModified: '2026-06-12',
    readingMinutes: 6,
    intro: [
      'Claude Code hooks are small scripts that run automatically at fixed points in an AI coding session — before a tool runs, after a file is written, when the agent stops. They turn “please remember to…” into a guarantee the model cannot skip.',
      'This guide explains what a hook is, how the lifecycle works, why hooks beat prompt instructions for anything that must always happen, and how to install your first hook in under a minute.',
    ],
    sections: [
      {
        heading: 'What is a Claude Code hook?',
        body: [
          'A Claude Code hook is a Node.js script (a `.mjs` file) registered in `.claude/settings.json` and bound to a lifecycle event. When that event fires, Claude Code runs the script in a separate process, passes it context on stdin as JSON, and reads its stdout. The model itself never executes the hook and cannot choose to skip it.',
          'Because hooks run outside the model, they are deterministic: the same event always triggers the same script with the same logic. That is the core property that makes them useful for guardrails, gates, and automation.',
        ],
      },
      {
        heading: 'How does the hook lifecycle work?',
        body: [
          'Claude Code exposes a set of lifecycle events. The most common ones are:',
          {
            list: [
              'PreToolUse — runs before a tool (Bash, Write, Edit, WebFetch…) executes. It can block the action by returning `{ "decision": "block", "reason": "…" }` on stdout.',
              'PostToolUse — runs after a tool completes. Used for auto-formatting, linting, and type-checking.',
              'UserPromptSubmit — fires on each prompt. Used to inject project context, the date, or conventions.',
              'Stop — fires when Claude finishes a task. Used for tests, changelogs, and quality gates.',
              'SessionStart / SessionEnd — fire at session boundaries. Used for git context injection and audit logs.',
              'Notification, SubagentStop, PreCompact — fire on user-input requests, subagent completion, and before context compaction.',
            ],
          },
          'A hook reads its input with `JSON.parse(readFileSync(0, "utf8"))`, decides what to do, and writes a small JSON result (or stays silent). PreToolUse hooks are the only ones that can stop an action before it happens.',
        ],
      },
      {
        heading: 'Why use hooks instead of prompt instructions?',
        body: [
          'Prompt instructions — including a `CLAUDE.md` file — are probabilistic. The model reads them and usually follows them, but it can drift, forget, or decide an exception applies. For anything that must happen every single time, “usually” is not good enough.',
          'Hooks are deterministic Node.js scripts that execute unconditionally on matching events. There is no drift, no hallucination, and no forgotten rule. They also cost zero tokens: the script runs in its own process and never enters the model’s context window unless it explicitly returns a message.',
        ],
      },
      {
        heading: 'What can you do with Claude Code hooks?',
        body: [
          'A few high-value patterns the HookStack catalogue covers:',
          {
            list: [
              'Block a leaked API key before a shell command runs (PreToolUse).',
              'Run your test suite when the agent says it is done (Stop).',
              'Auto-format and lint every file the moment it is written (PostToolUse).',
              'Inject your project conventions and the current date on every prompt (UserPromptSubmit).',
              'Refuse edits on the main branch until you create a feature branch (PreToolUse).',
            ],
          },
        ],
      },
      {
        heading: 'How do I install a Claude Code hook?',
        body: [
          'With HookStack it takes three steps: browse the catalogue, select the hooks you want, and run the generated command in your project root.',
          { code: 'npx hookstack-cli@latest install' },
          'The CLI writes the scripts to `.claude/hooks/` and patches your `.claude/settings.json` — nothing else is touched.',
        ],
      },
      {
        heading: 'Are hooks safe, and do they slow Claude down?',
        body: [
          'Hooks run in a separate process with explicit timeouts, so a slow or missing tool cannot hang your session. PostToolUse hooks are non-blocking by design: if an external tool is not installed, they simply exit quietly. Keep heavy hooks fast by filtering on file extension before running an expensive command.',
        ],
      },
    ],
    faq: [
      { q: 'Do Claude Code hooks work on Windows?', a: 'Yes. Hooks are Node.js scripts and Node is the one runtime Claude Code guarantees, so the same `.mjs` runs on macOS, Linux, and Windows.' },
      { q: 'Do hooks consume tokens from my context window?', a: 'No. Hooks run in a separate process outside the model. They can inject context via stdout if you choose, but the script and whatever it computes never reach the model unless you return a message.' },
      { q: 'Can a hook block Claude from doing something?', a: 'Yes — a PreToolUse hook can block the action by writing { "decision": "block", "reason": "…" } to stdout before the tool runs.' },
      { q: 'Where do hooks live in my project?', a: 'Scripts live in .claude/hooks/ and are referenced by event in .claude/settings.json.' },
    ],
    relatedHookSlugs: ['pre-bash-secret-detection', 'post-write-eslint', 'stop-run-tests', 'user-prompt-inject-conventions'],
    sources: [{ label: 'Anthropic — Claude Code hooks documentation', url: DOCS }],
  },
  {
    slug: 'pretooluse-vs-posttooluse',
    title: 'PreToolUse vs PostToolUse: Which Claude Code Hook to Use',
    metaTitle: 'PreToolUse vs PostToolUse — Choosing the Right Hook',
    description:
      'PreToolUse runs before a tool and can block it; PostToolUse runs after and reacts. Learn when to use each Claude Code hook event, with examples and a simple decision rule.',
    datePublished: '2026-06-12',
    dateModified: '2026-06-12',
    readingMinutes: 5,
    intro: [
      'PreToolUse and PostToolUse are the two most-used Claude Code hook events — and the difference between them decides whether you can prevent a bad action or only react to it.',
      'This guide explains exactly what each event does, when to reach for which, and gives you a one-line rule for choosing.',
    ],
    sections: [
      {
        heading: 'What is the difference between PreToolUse and PostToolUse?',
        body: [
          'PreToolUse runs before a tool executes. It sees the tool input — the command, the file path, the URL — and it can block the action entirely by returning a block decision. Nothing happens until your hook says yes.',
          'PostToolUse runs after the tool has already completed. It can read the result and react — format the file, run a linter, log the command — but it cannot undo what just happened. By the time it runs, the change exists.',
        ],
      },
      {
        heading: 'When should you use PreToolUse?',
        body: [
          'Use PreToolUse whenever the goal is prevention: stopping something dangerous, invalid, or out-of-policy before it lands.',
          {
            list: [
              'Block destructive shell commands (rm -rf, force pushes) before they run.',
              'Scan a command or a file write for secrets and refuse if one is found.',
              'Refuse writes on the main branch until a feature branch exists.',
              'Validate that the agent is using the right package manager.',
            ],
          },
          'A PreToolUse hook blocks by writing `{ "decision": "block", "reason": "…" }` to stdout. Always give an actionable reason — the model reads it and can correct course.',
        ],
      },
      {
        heading: 'When should you use PostToolUse?',
        body: [
          'Use PostToolUse for reactions — anything that should happen in response to a change, not instead of it.',
          {
            list: [
              'Auto-format a file the moment it is written.',
              'Run ESLint or type-checking after an edit and surface problems.',
              'Type-check the whole batch after a set of parallel edits.',
              'Log every Bash command for an audit trail.',
            ],
          },
          'PostToolUse hooks are non-blocking: if the tool they rely on is missing, they exit quietly rather than breaking the session.',
        ],
      },
      {
        heading: 'Can PostToolUse stop a bad change?',
        body: [
          'No — by the time PostToolUse runs, the change already exists. What it can do is make the problem visible (a failing lint, a type error) so the next step fixes it. If you genuinely need to prevent the action, that is a PreToolUse job.',
        ],
      },
      {
        heading: 'A simple decision rule',
        body: [
          { list: ['Need to prevent or validate an action? → PreToolUse.', 'Need to react to a completed action? → PostToolUse.'] },
          'The two compose well: a PreToolUse guard stops dangerous writes, while a PostToolUse formatter cleans up the writes that are allowed.',
        ],
      },
    ],
    faq: [
      { q: 'Is PreToolUse a blocking hook?', a: 'Yes. PreToolUse can block the tool from running by returning a block decision on stdout; PostToolUse cannot.' },
      { q: 'Does PostToolUse slow Claude Code down?', a: 'It runs after the tool, so keep it fast: filter by file extension before launching an expensive command, and set a timeout. Missing tools fail silently.' },
      { q: 'Can I use both events together?', a: 'Yes, and it is a common combination — PreToolUse to guard, PostToolUse to format and check.' },
    ],
    relatedHookSlugs: ['pre-bash-block-destructive', 'pre-bash-secret-detection', 'post-write-eslint', 'post-tool-batch-typecheck'],
    sources: [{ label: 'Anthropic — Claude Code hooks documentation', url: DOCS }],
  },
  {
    slug: 'claude-code-hooks-vs-slash-commands',
    title: 'Claude Code Hooks vs Slash Commands vs Prompt Instructions',
    metaTitle: 'Hooks vs Slash Commands vs Prompt Instructions',
    description:
      'Three ways to steer Claude Code — hooks, slash commands, and prompt instructions. Learn how they differ, when to use each, and why only hooks are guaranteed to run.',
    datePublished: '2026-06-12',
    dateModified: '2026-06-12',
    readingMinutes: 5,
    intro: [
      'There are three ways to shape how Claude Code behaves: prompt instructions, slash commands, and hooks. They look interchangeable but they sit at very different levels of control — and only one of them is guaranteed to run.',
      'This guide compares all three so you know which tool to reach for, and how to combine them.',
    ],
    sections: [
      {
        heading: 'Hooks vs slash commands vs prompt instructions: what is the difference?',
        body: [
          'Prompt instructions are text the model reads and usually follows. Slash commands are reusable prompts you invoke on demand inside the conversation. Hooks are scripts that fire outside the model on lifecycle events. The first two steer the AI; the third constrains it.',
        ],
      },
      {
        heading: 'What are prompt instructions (CLAUDE.md)?',
        body: [
          'Prompt instructions live in your prompt or in a `CLAUDE.md` file the model loads as context. They are perfect for soft guidance — coding style, tone, architectural preferences — but they are probabilistic. The model may follow them, may interpret them loosely, or may decide an exception applies.',
        ],
      },
      {
        heading: 'What are slash commands?',
        body: [
          'Slash commands are interactive: you type something like `/gen-test-unit` and the model reads the command and acts on it inside the conversation. They are great for on-demand tasks you trigger yourself. But because the model interprets and executes them, they are still inside the probabilistic loop — and they consume context.',
        ],
      },
      {
        heading: 'What makes hooks different?',
        body: [
          'Hooks are Node.js scripts that fire unconditionally on lifecycle events (PreToolUse, PostToolUse, Stop…). The model never sees them, never decides whether to run them, and cannot skip them. They cost zero tokens because they run in a separate process. That guarantee is what makes them the right tool for anything that must always happen.',
        ],
      },
      {
        heading: 'When should you use each?',
        body: [
          {
            list: [
              'Prompt instructions / CLAUDE.md → soft guidance and preferences.',
              'Slash commands → on-demand, interactive tasks you trigger.',
              'Hooks → guarantees: guardrails, gates, and automation that must run every time.',
            ],
          },
        ],
      },
      {
        heading: 'Can you combine them?',
        body: [
          'Yes — and the best setups do. Use `CLAUDE.md` to set direction, slash commands for repeatable tasks, and hooks to enforce the non-negotiables (run tests, block secrets, protect main). They are layers, not alternatives.',
        ],
      },
    ],
    faq: [
      { q: 'Are hooks better than slash commands?', a: 'They do different jobs. Slash commands are interactive tasks you trigger; hooks are guarantees that fire automatically and cannot be skipped. Use both.' },
      { q: 'Do hooks replace CLAUDE.md?', a: 'No. CLAUDE.md is great for soft guidance the model interprets. Hooks enforce the rules that must hold regardless of what the model decides.' },
      { q: 'Do slash commands consume tokens?', a: 'Yes — commands are part of the conversation and consume context. Hooks run outside the model and cost zero tokens.' },
    ],
    relatedHookSlugs: ['user-prompt-inject-conventions', 'pre-write-main-guard', 'stop-run-tests'],
    sources: [{ label: 'Anthropic — Claude Code hooks documentation', url: DOCS }],
  },
]

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug)
}
