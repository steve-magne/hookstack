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
  // Slugs of other guides for the "Read next" internal-linking block.
  related?: string[]
  relatedHookSlugs: string[]
  sources: GuideSource[]
}

const DOCS = 'https://docs.claude.com/en/docs/claude-code/hooks'

export const guides: Guide[] = [
  {
    slug: 'what-are-claude-code-hooks',
    title: 'What Are Claude Code Hooks? A Practical Guide',
    metaTitle: 'What Are Claude Code Hooks? Practical Guide',
    description:
      'Claude Code hooks are commands that run automatically at lifecycle events. See the lifecycle, a complete working hook, and the settings.json that wires it up.',
    datePublished: '2026-06-12',
    dateModified: '2026-06-12',
    readingMinutes: 7,
    intro: [
      'Claude Code hooks are small programs that run automatically at fixed points in an AI coding session — before a tool runs, after a file is written, when the agent stops. They turn “please remember to…” into a guarantee the model cannot skip.',
      'This guide explains what a hook actually is, shows you a complete working hook and the `settings.json` that registers it, walks through the JSON Claude Code hands the script on stdin, and explains why hooks beat prompt instructions for anything that must always happen.',
    ],
    sections: [
      {
        heading: 'What is a Claude Code hook?',
        body: [
          'A Claude Code hook is any executable command registered in `.claude/settings.json` and bound to a lifecycle event. When that event fires, Claude Code runs your command in a separate process, passes it context as JSON on stdin, and reads its stdout (and exit code). The model itself never executes the hook and cannot choose to skip it.',
          'A hook does not have to be written in any particular language — it is just a command, so a Bash script, a Python file, or a compiled binary all work. HookStack standardizes every hook on a Node.js `.mjs` file for one reason: Node is the only runtime Claude Code guarantees on every platform it runs on. A `.mjs` hook runs identically on macOS, Linux, and Windows with zero extra setup, which is exactly what you want from a guardrail that has to be there every time.',
          'Because the command runs outside the model, it is deterministic: the same event always triggers the same logic. That is the core property that makes hooks useful for guardrails, gates, and automation.',
        ],
      },
      {
        heading: 'What does a complete hook look like?',
        body: [
          'Here is a full, runnable PreToolUse hook. It reads the tool call from stdin, blocks any Bash command containing `rm -rf /`, and otherwise stays silent. This is the exact pattern every hook in the HookStack catalogue follows — a pure `run()` function plus a small entry guard.',
          {
            code: `// .claude/hooks/block-rm-rf.mjs
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

export function run(input) {
  if (input.tool_name !== 'Bash') return null
  const command = input.tool_input?.command ?? ''
  if (/rm\\s+-rf?\\s+\\/(?:\\s|$)/.test(command)) {
    return { decision: 'block', reason: 'rm -rf / is blocked. Run it manually if intentional.' }
  }
  return null // null = allow, hook stays silent
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8')) // read stdin (fd 0)
  const result = run(input)
  if (result) process.stdout.write(JSON.stringify(result))
}`,
          },
          'The script reads the entire stdin payload with `JSON.parse(readFileSync(0, "utf8"))`, decides what to do, and — only if it wants to block — writes `{ "decision": "block", "reason": "…" }` to stdout. Returning nothing means “allow”. Keeping the logic in a pure `run()` function (separate from the stdin/stdout marshalling) is what makes the hook unit-testable.',
        ],
      },
      {
        heading: 'How do I register a hook in settings.json?',
        body: [
          'A script on disk does nothing until you wire it to an event in `.claude/settings.json`. You declare the event, an optional matcher (which tool it applies to), and the command to run. Use `$CLAUDE_PROJECT_DIR` so the path resolves regardless of where Claude Code is launched.',
          {
            code: `// .claude/settings.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node $CLAUDE_PROJECT_DIR/.claude/hooks/block-rm-rf.mjs"
          }
        ]
      }
    ]
  }
}`,
          },
          'The structure nests three levels: the event name (`PreToolUse`), one or more matcher groups, and the list of commands to run. The `matcher` filters by tool name — `"Bash"` runs the hook only on Bash calls, `"Write|Edit"` on either, `"*"` (or omitting it) on every tool.',
        ],
      },
      {
        heading: 'What JSON does a hook receive on stdin?',
        body: [
          'Every hook is handed a JSON object on stdin. A few fields are common to all events; tool events add the tool name and its input. The `block-rm-rf` hook above reads `tool_name` and `tool_input.command` from this payload:',
          {
            code: `{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/Users/you/project",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "rm -rf / --no-preserve-root"
  }
}`,
          },
          'PostToolUse hooks get the same shape plus a `tool_response` field with the tool’s result. UserPromptSubmit hooks receive `{ "prompt": "…" }`. SessionStart hooks receive a `source` field (`startup`, `resume`, `clear`, `compact`). The full per-event payload reference is in the official docs linked below.',
        ],
      },
      {
        heading: 'How does the hook lifecycle work?',
        body: [
          'Claude Code exposes a set of lifecycle events. The most common ones are:',
          {
            list: [
              'PreToolUse — runs before a tool (Bash, Write, Edit, WebFetch…) executes. It can block the action by returning `{ "decision": "block", "reason": "…" }` on stdout.',
              'PostToolUse — runs after a tool completes, with the tool result available. Used for auto-formatting, linting, and type-checking.',
              'UserPromptSubmit — fires on each prompt. Whatever it prints to stdout becomes extra context for that turn — used to inject project conventions or the current date.',
              'Stop — fires when Claude finishes a task. Used for tests, changelogs, and quality gates.',
              'SessionStart / SessionEnd — fire at session boundaries. Used for git context injection and audit logs.',
              'Notification, SubagentStop, PreCompact — fire on user-input requests, subagent completion, and before context compaction.',
            ],
          },
          'PreToolUse hooks are the only ones that can stop an action before it happens. Everything else reacts to or annotates what has already occurred.',
        ],
      },
      {
        heading: 'Why use hooks instead of prompt instructions?',
        body: [
          'Prompt instructions — including a `CLAUDE.md` file — are probabilistic. The model reads them and usually follows them, but it can drift, forget, or decide an exception applies. For anything that must happen every single time, “usually” is not good enough.',
          'Hooks execute unconditionally on matching events. There is no drift, no hallucination, and no forgotten rule. They are also cheap on context: the command runs in its own process and nothing it computes enters the model’s context window unless the hook explicitly prints text back (a blocking `reason`, or context injected by a UserPromptSubmit hook). That returned text is the only part that costs tokens.',
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
          'You can write your own (see the first-hook tutorial below), or install production-ready hooks from HookStack in one command. Browse the catalogue, select the hooks you want, and run the generated command in your project root:',
          { code: 'npx hookstack-cli@latest install' },
          'The CLI writes the scripts to `.claude/hooks/` and patches your `.claude/settings.json` — nothing else is touched. Every hook in the catalogue is a real `.mjs` that HookStack runs and unit-tests on its own repository, so you install the exact code that runs in production.',
        ],
      },
    ],
    faq: [
      { q: 'Do Claude Code hooks have to be written in JavaScript?', a: 'No. A hook is any executable command — Bash, Python, or a binary all work. HookStack standardizes on Node.js .mjs files because Node is the one runtime Claude Code guarantees on every platform, so the same hook runs on macOS, Linux, and Windows.' },
      { q: 'Do hooks consume tokens from my context window?', a: 'Only what they print back. A hook runs in a separate process; nothing it computes reaches the model unless it returns text — a blocking reason or context injected by a UserPromptSubmit hook. A silent hook costs zero tokens.' },
      { q: 'Can a hook block Claude from doing something?', a: 'Yes — a PreToolUse hook can block the action by writing { "decision": "block", "reason": "…" } to stdout before the tool runs.' },
      { q: 'Where do hooks live in my project?', a: 'Scripts live in .claude/hooks/ and are referenced by event and matcher in .claude/settings.json, usually as "node $CLAUDE_PROJECT_DIR/.claude/hooks/<name>.mjs".' },
    ],
    related: ['write-your-first-claude-code-hook', 'claude-code-hooks-examples', 'pretooluse-vs-posttooluse', 'claude-code-hooks-vs-slash-commands'],
    relatedHookSlugs: ['pre-bash-secret-detection', 'post-write-eslint', 'stop-run-tests', 'user-prompt-inject-conventions'],
    sources: [{ label: 'Anthropic — Claude Code hooks documentation', url: DOCS }],
  },
  {
    slug: 'pretooluse-vs-posttooluse',
    title: 'PreToolUse vs PostToolUse: Which Claude Code Hook to Use',
    metaTitle: 'PreToolUse vs PostToolUse Hooks Explained',
    description:
      'PreToolUse runs before a tool and can block it; PostToolUse runs after and reacts. See two complete hooks, the differing stdin payloads, and a one-line rule.',
    datePublished: '2026-06-12',
    dateModified: '2026-06-12',
    readingMinutes: 7,
    intro: [
      'PreToolUse and PostToolUse are the two most-used Claude Code hook events — and the difference between them decides whether you can prevent a bad action or only react to it.',
      'This guide explains exactly what each event does, shows a complete blocking PreToolUse hook next to a complete PostToolUse formatter, walks through their differing stdin payloads, covers matcher syntax, and gives you a one-line rule for choosing.',
    ],
    sections: [
      {
        heading: 'What is the difference between PreToolUse and PostToolUse?',
        body: [
          'PreToolUse runs before a tool executes. It sees the tool input — the command, the file path, the URL — and it can block the action entirely by returning a block decision. Nothing happens until your hook says yes.',
          'PostToolUse runs after the tool has already completed. It receives the tool’s result and can react — format the file, run a linter, log the command — but it cannot undo what just happened. By the time it runs, the change exists.',
        ],
      },
      {
        heading: 'What does a PreToolUse hook look like?',
        body: [
          'A PreToolUse hook inspects `tool_input` and returns a block decision to stop the action. This one — adapted from the HookStack secret-detection hook — refuses any Bash command that looks like it contains an API key:',
          {
            code: `// .claude/hooks/pre-bash-secret-detection.mjs
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const SECRET_PATTERNS = [
  /sk-(?:ant-|proj-)?[a-zA-Z0-9_-]{32,}/,        // Anthropic / OpenAI keys
  /ghp_[a-zA-Z0-9]{36}/,                          // GitHub PAT
  /(?:password|secret|token)\\s*=\\s*['"][^'"]{6,}/i,
]

export function run(input) {
  if (input.tool_name !== 'Bash') return null
  const command = input.tool_input?.command ?? ''
  const hit = SECRET_PATTERNS.find((p) => p.test(command))
  return hit
    ? { decision: 'block', reason: 'Possible secret in the command. Move it to an env var before running.' }
    : null
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'))
  const result = run(input)
  if (result) process.stdout.write(JSON.stringify(result))
}`,
          },
          'A PreToolUse hook blocks by writing `{ "decision": "block", "reason": "…" }` to stdout. Always give an actionable reason — the model reads it and can correct course. (The runtime also supports a stricter `hookSpecificOutput.permissionDecision: "deny"` form; the top-level `decision` shown here is the convention HookStack ships.)',
        ],
      },
      {
        heading: 'What does a PostToolUse hook look like?',
        body: [
          'A PostToolUse hook reacts to a completed change. This one lints a file right after it is written or edited, surfacing any problems on stderr so the next step can fix them. Note the extension filter — you do not want to launch ESLint on a Markdown file:',
          {
            code: `// .claude/hooks/post-write-eslint.mjs
import { readFileSync } from 'fs'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

export function run(input, { exec = (c) => execSync(c, { stdio: 'pipe', timeout: 15_000 }) } = {}) {
  const filePath = input.tool_input?.file_path ?? ''
  if (!filePath || !/\\.[cm]?[jt]sx?$/.test(filePath)) return null // only JS/TS files

  try {
    exec(\`npx --no-install eslint --max-warnings=0 "\${filePath}"\`)
    return null // clean
  } catch (err) {
    const output = err.stdout?.toString() ?? ''
    return output ? { message: \`ESLint: \${output.trim()}\\n\` } : null
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'))
  const result = run(input)
  if (result?.message) process.stderr.write(result.message)
}`,
          },
          'Because the change already landed, the hook’s job is to make problems visible, not to prevent them. It writes the lint output to stderr; Claude reads it and fixes the file on the next turn.',
        ],
      },
      {
        heading: 'How do the stdin payloads differ?',
        body: [
          'Both events receive the common fields (`session_id`, `cwd`, `hook_event_name`, `tool_name`, `tool_input`). The difference is that PostToolUse adds a `tool_response` field with the result of the tool that just ran:',
          {
            code: `// PreToolUse — before the tool runs (no result yet)
{ "hook_event_name": "PreToolUse", "tool_name": "Write",
  "tool_input": { "file_path": "src/api.ts", "content": "…" } }

// PostToolUse — after the tool ran (result included)
{ "hook_event_name": "PostToolUse", "tool_name": "Write",
  "tool_input":    { "file_path": "src/api.ts", "content": "…" },
  "tool_response": "File written successfully" }`,
          },
          'That extra `tool_response` is exactly why PostToolUse can react to outcomes — it knows whether the write succeeded and what the tool returned.',
        ],
      },
      {
        heading: 'How do matchers decide which tool a hook runs on?',
        body: [
          'The `matcher` on each hook group filters by tool name. The syntax is small:',
          {
            list: [
              '`"Bash"` — exact match, runs only on Bash calls.',
              '`"Write|Edit"` — pipe-separated list, runs on either Write or Edit.',
              '`"*"` (or omitting the matcher) — runs on every tool.',
              'Anything with a special character is treated as a JavaScript regex — e.g. `"mcp__memory__.*"` matches every tool from the `memory` MCP server.',
            ],
          },
          'So a secret-detection PreToolUse hook uses `"Bash"`, while a formatter PostToolUse hook uses `"Write|Edit"` because both write to disk.',
        ],
      },
      {
        heading: 'Are PostToolUse hooks really non-blocking?',
        body: [
          'Mostly yes — but be precise about why. By the time PostToolUse runs, the change already exists, so it cannot un-write a file. It can, however, still return a block decision that tells Claude to stop and reconsider. What makes HookStack’s PostToolUse hooks “non-blocking” is an implementation convention, not a runtime guarantee: they wrap external tools in a silent try/catch so a missing binary (ESLint not installed, for example) just exits quietly instead of breaking your session. If you write your own PostToolUse hook that throws or returns a block decision, it will interrupt the flow.',
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
      { q: 'Is PreToolUse a blocking hook?', a: 'Yes. PreToolUse runs before the tool and can block it by returning { "decision": "block", "reason": "…" } on stdout. PostToolUse runs after the change has landed, so it cannot prevent it.' },
      { q: 'What is the difference in the stdin payload?', a: 'Both get tool_name and tool_input. PostToolUse additionally receives tool_response — the result of the tool that just ran — which is why it can react to outcomes.' },
      { q: 'Are PostToolUse hooks always non-blocking?', a: 'Not inherently. HookStack PostToolUse hooks exit quietly on missing tools by convention (silent try/catch), but the runtime still lets a PostToolUse hook return a block decision. The non-blocking behavior is a design choice, not a hard rule.' },
      { q: 'Can I use both events together?', a: 'Yes, and it is a common combination — PreToolUse to guard, PostToolUse to format and check.' },
    ],
    related: ['what-are-claude-code-hooks', 'secure-claude-code-with-hooks', 'claude-code-hooks-not-working', 'write-your-first-claude-code-hook'],
    relatedHookSlugs: ['pre-bash-block-destructive', 'pre-bash-secret-detection', 'post-write-eslint', 'post-tool-batch-typecheck'],
    sources: [{ label: 'Anthropic — Claude Code hooks documentation', url: DOCS }],
  },
  {
    slug: 'claude-code-hooks-vs-slash-commands',
    title: 'Claude Code Hooks vs Slash Commands vs Prompt Instructions',
    metaTitle: 'Hooks vs Slash Commands vs CLAUDE.md',
    description:
      'Hooks, slash commands, and prompt instructions steer Claude Code at different levels. See a slash command vs a hook, how they differ from MCP, when to use each.',
    datePublished: '2026-06-12',
    dateModified: '2026-06-12',
    readingMinutes: 7,
    intro: [
      'There are several ways to shape how Claude Code behaves: prompt instructions, slash commands, hooks, and MCP servers. They look interchangeable but they sit at very different levels of control — and only one of them is guaranteed to run.',
      'This guide compares them with concrete examples — an actual slash command file next to an actual hook — so you know which tool to reach for and how to combine them.',
    ],
    sections: [
      {
        heading: 'Hooks vs slash commands vs prompt instructions: what is the difference?',
        body: [
          'Prompt instructions are text the model reads and usually follows. Slash commands are reusable prompts you invoke on demand inside the conversation. Hooks are commands that fire outside the model on lifecycle events. The first two steer the AI; the third constrains it.',
        ],
      },
      {
        heading: 'What does a slash command look like?',
        body: [
          'A slash command is just a Markdown file in `.claude/commands/`. Its filename becomes the command name, and its body is a prompt the model reads when you type the command. Here is `/gen-test` — type it and the model writes tests for the current file:',
          {
            code: `<!-- .claude/commands/gen-test.md -->
---
description: Generate unit tests for the current file
---

Write thorough unit tests for the file I'm currently editing.
Cover the happy path, edge cases, and error handling.
Use the project's existing test framework and conventions.`,
          },
          'When you type `/gen-test`, Claude Code injects this prompt into the conversation and the model acts on it. It is interpreted by the model, runs inside the context window, and only happens when you trigger it.',
        ],
      },
      {
        heading: 'What does a hook look like by comparison?',
        body: [
          'A hook is a command on disk plus a registration in `settings.json`. It is not a prompt — the model never reads it. Here is a hook that runs your tests every time Claude says it is done, registered on the `Stop` event:',
          {
            code: `// .claude/settings.json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "node $CLAUDE_PROJECT_DIR/.claude/hooks/stop-run-tests.mjs" }
        ]
      }
    ]
  }
}`,
          },
          'The `Stop` event has no matcher — it always fires when Claude finishes. The script runs in its own process, runs the test suite, and reports failures back. The model did not decide to run it and cannot skip it. That is the structural difference: a slash command is an instruction you give the model; a hook is a rule the runtime enforces around the model.',
        ],
      },
      {
        heading: 'What are prompt instructions (CLAUDE.md)?',
        body: [
          'Prompt instructions live in your prompt or in a `CLAUDE.md` file the model loads as context. They are perfect for soft guidance — coding style, tone, architectural preferences — but they are probabilistic. The model may follow them, may interpret them loosely, or may decide an exception applies.',
        ],
      },
      {
        heading: 'Do hooks really cost zero tokens?',
        body: [
          'A hook runs in a separate process, so its logic never enters the context window — that part genuinely costs nothing. But the claim is often overstated. The moment a hook prints text back to the model, that text consumes tokens: a PreToolUse hook that blocks with a `reason`, or a UserPromptSubmit hook that injects context, both add to the conversation. A silent hook is free; a talkative one is not. The win is that you control exactly what (if anything) reaches the model, instead of paying for instructions the model re-reads every turn.',
        ],
      },
      {
        heading: 'How are hooks different from MCP servers?',
        body: [
          'MCP (Model Context Protocol) servers and hooks solve opposite problems. An MCP server adds capabilities: it gives the model new tools and data sources — a database it can query, an API it can call, a knowledge base it can read. Hooks govern the lifecycle: they sit around the tools the model already has and decide what is allowed, what gets logged, and what runs automatically.',
          { list: ['MCP server → expand what Claude can do (new tools, new data).', 'Hook → constrain and automate how Claude uses the tools it already has.'] },
          'They are complementary. You might add an MCP server for your internal API, then add a PreToolUse hook that blocks calls to it without the right scope.',
        ],
      },
      {
        heading: 'When should you use each?',
        body: [
          {
            list: [
              'Prompt instructions / CLAUDE.md → soft guidance and preferences.',
              'Slash commands → on-demand, interactive tasks you trigger yourself.',
              'Hooks → guarantees: guardrails, gates, and automation that must run every time.',
              'MCP servers → new capabilities and data the model would not otherwise have.',
            ],
          },
        ],
      },
      {
        heading: 'Can you combine them?',
        body: [
          'Yes — and the best setups do. Use `CLAUDE.md` to set direction, slash commands for repeatable tasks, MCP servers for new capabilities, and hooks to enforce the non-negotiables (run tests, block secrets, protect main). They are layers, not alternatives.',
        ],
      },
    ],
    faq: [
      { q: 'Are hooks better than slash commands?', a: 'They do different jobs. Slash commands are interactive prompts you trigger; hooks are commands the runtime fires automatically and the model cannot skip. Use both.' },
      { q: 'Do hooks replace CLAUDE.md?', a: 'No. CLAUDE.md is great for soft guidance the model interprets. Hooks enforce the rules that must hold regardless of what the model decides.' },
      { q: 'Do hooks really cost zero tokens?', a: 'A silent hook does — it runs outside the context window. But any text a hook prints back (a block reason, injected context) does consume tokens. You control exactly what reaches the model.' },
      { q: 'What is the difference between a hook and an MCP server?', a: 'An MCP server adds new capabilities and data the model can use. A hook governs the lifecycle around tools the model already has — allowing, blocking, logging, and automating.' },
    ],
    related: ['what-are-claude-code-hooks', 'pretooluse-vs-posttooluse', 'write-your-first-claude-code-hook'],
    relatedHookSlugs: ['user-prompt-inject-conventions', 'pre-write-main-guard', 'stop-run-tests'],
    sources: [{ label: 'Anthropic — Claude Code hooks documentation', url: DOCS }],
  },
  {
    slug: 'claude-code-hooks-not-working',
    title: 'Claude Code Hooks Not Working? A Troubleshooting Guide',
    metaTitle: 'Claude Code Hooks Not Working? Fix Guide',
    description:
      'Claude Code hook not firing, output ignored, or breaking your session? Diagnose the common causes — bad matcher, invalid JSON, wrong exit code, paths — fix each.',
    datePublished: '2026-06-12',
    dateModified: '2026-06-12',
    readingMinutes: 8,
    intro: [
      'Your hook is not firing, its output is being ignored, or it is silently breaking your session — and Claude Code is not telling you why. Hooks fail quietly by design, which makes them frustrating to debug the first time.',
      'This guide walks through the most common reasons a Claude Code hook does not work, with a concrete diagnostic and fix for each. Work top to bottom; the causes are roughly ordered from most to least common.',
    ],
    sections: [
      {
        heading: 'First: how do I see what my hook is doing?',
        body: [
          'Before guessing, get visibility. Two commands solve most cases. Run Claude Code with the debug flag to see hooks being matched, executed, and what they return:',
          { code: 'claude --debug' },
          'And test the script in isolation by piping it a fake payload — exactly the JSON Claude Code would send. If it works here but not in a session, the problem is the registration, not the script:',
          {
            code: `echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' \\
  | node .claude/hooks/block-rm-rf.mjs

# Expect: {"decision":"block","reason":"…"}  →  script is fine
# No output / a stack trace  →  the bug is in the script`,
          },
        ],
      },
      {
        heading: 'Why is my hook never firing?',
        body: [
          'If `claude --debug` shows the hook is never even invoked, the registration is wrong. Check, in order:',
          {
            list: [
              'Wrong event name. The keys under `hooks` are case-sensitive and exact: `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`. A typo like `preToolUse` or `PostTool` silently registers nothing.',
              'Matcher does not match the tool. `"matcher": "Bash"` only fires on Bash. If you expected it on file writes, you need `"Write|Edit"`. Use `"*"` or omit the matcher to fire on everything while debugging.',
              'settings.json in the wrong place. Project hooks must be in `.claude/settings.json` at the project root — not in `~/.claude/` (that is global) and not in a subdirectory.',
              'Invalid JSON in settings.json. A trailing comma or missing brace makes Claude Code skip the entire hooks block. Validate it.',
            ],
          },
          'Validate the file with a one-liner — if it prints nothing, the JSON is malformed:',
          { code: "node -e \"JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('settings.json is valid')\"" },
        ],
      },
      {
        heading: 'Why is my hook running but its output ignored?',
        body: [
          'If the script runs (you see it in `--debug`) but nothing happens, the problem is what it writes and where. Claude Code only reads a block decision from valid JSON on stdout. Common causes:',
          {
            list: [
              'Invalid JSON on stdout. If you print anything that is not parseable JSON, the decision is ignored. A stray `console.log("debug")` corrupts the output — debug to stderr instead.',
              'Wrong channel. A block decision must go to stdout. Diagnostic messages, lint output, and logs go to stderr. Mixing them up means Claude Code parses your log line as the decision and discards it.',
              'Returning the wrong shape. PreToolUse blocks with `{ "decision": "block", "reason": "…" }`. Returning `{ "blocked": true }` or a plain string does nothing.',
              'Silent success looks the same as failure. A hook that returns nothing means “allow”. If you expected it to block, log to stderr to confirm your branch is even reached.',
            ],
          },
          'The safe pattern: decisions to stdout, everything else to stderr.',
          {
            code: `// correct
process.stdout.write(JSON.stringify({ decision: 'block', reason: '…' })) // the decision
process.stderr.write('debug: matched secret pattern\\n')                  // logs

// wrong — this console.log lands on stdout and corrupts the decision
console.log('checking command…')`,
          },
        ],
      },
      {
        heading: 'How do exit codes affect my hook?',
        body: [
          'Claude Code interprets the hook’s exit code, and getting it wrong changes the behavior entirely:',
          {
            list: [
              'Exit 0 — success. Claude Code parses JSON from stdout (a block decision, injected context, etc.). This is what the HookStack convention uses.',
              'Exit 2 — blocking error. stdout is ignored; stderr is fed back to Claude and the action is blocked. This is the alternative way to block, driven by stderr instead of JSON.',
              'Any other exit code — non-blocking error. The first line of stderr shows in the transcript, the action continues. An uncaught exception throws here, so your hook “does nothing” because it crashed before printing.',
            ],
          },
          'If your hook throws (a bad `JSON.parse`, a missing file), Node exits non-zero and the action proceeds as if the hook never ran. Wrap risky work in try/catch, or let it crash on purpose only when you intend exit-2 blocking behavior.',
        ],
      },
      {
        heading: 'Why does my hook hang or break the session?',
        body: [
          'A hook that never returns will stall Claude Code, and a PreToolUse hook that crashes can make every tool call fail. Two fixes:',
          {
            list: [
              'Set a timeout on every external command. An `execSync` without a `timeout` can hang forever if the tool prompts for input or waits on a network call. Always pass `{ timeout: 15_000 }`.',
              'Filter before doing expensive work. Check the file extension or tool name first and return `null` early. Running ESLint on every file (including images and JSON) is slow and error-prone.',
            ],
          },
          {
            code: `export function run(input) {
  const filePath = input.tool_input?.file_path ?? ''
  if (!/\\.[cm]?[jt]sx?$/.test(filePath)) return null // skip non-JS/TS fast

  try {
    execSync(\`npx --no-install eslint "\${filePath}"\`, { stdio: 'pipe', timeout: 15_000 })
    return null
  } catch {
    return null // tool missing or lint failed — never break the session
  }
}`,
          },
        ],
      },
      {
        heading: 'Why does my hook work standalone but not in Claude Code?',
        body: [
          'If `echo \'…\' | node .claude/hooks/x.mjs` works but the hook does nothing in a session, the problem is almost always the command path. Claude Code may launch from a different working directory than your project root, so a relative path like `node .claude/hooks/x.mjs` can resolve to the wrong place — or nowhere.',
          'Always reference the script with `$CLAUDE_PROJECT_DIR`, which Claude Code sets to the project root:',
          {
            code: `// wrong — relative path, breaks when cwd differs from project root
{ "type": "command", "command": "node .claude/hooks/x.mjs" }

// correct — absolute via the project-dir variable
{ "type": "command", "command": "node $CLAUDE_PROJECT_DIR/.claude/hooks/x.mjs" }`,
          },
        ],
      },
      {
        heading: 'Still stuck? A quick checklist',
        body: [
          { list: ['Run `claude --debug` and confirm the hook is matched and executed.', 'Pipe a fake payload to the script directly — does it print the JSON you expect?', 'Validate `.claude/settings.json` parses as JSON.', 'Confirm the event name and matcher are correct and case-exact.', 'Confirm decisions go to stdout and logs go to stderr.', 'Confirm the command uses `$CLAUDE_PROJECT_DIR`.', 'Confirm every external command has a timeout.'] },
        ],
      },
    ],
    faq: [
      { q: 'How do I debug a Claude Code hook?', a: 'Run Claude Code with claude --debug to see hooks being matched and executed, and test the script directly by piping it a fake payload: echo \'{"tool_name":"Bash","tool_input":{"command":"…"}}\' | node .claude/hooks/your-hook.mjs.' },
      { q: 'Why is my hook firing but not blocking?', a: 'Claude Code only reads a block decision from valid JSON on stdout. A stray console.log corrupts stdout, the wrong shape (not { decision: "block", reason }) is ignored, and logs must go to stderr, not stdout.' },
      { q: 'What exit code should a Claude Code hook return?', a: 'Exit 0 and print a JSON decision to stdout (the HookStack convention). Exit 2 blocks the action and sends stderr to Claude. Any other code is a non-blocking error and the action proceeds — which is what happens when your hook crashes.' },
      { q: 'Why does my hook work in the terminal but not in Claude Code?', a: 'Almost always a path issue. Reference the script with $CLAUDE_PROJECT_DIR (node $CLAUDE_PROJECT_DIR/.claude/hooks/x.mjs) instead of a relative path, because Claude Code may run from a different working directory.' },
    ],
    related: ['write-your-first-claude-code-hook', 'claude-code-settings-json', 'what-are-claude-code-hooks', 'pretooluse-vs-posttooluse'],
    relatedHookSlugs: ['pre-bash-secret-detection', 'pre-bash-block-destructive', 'post-write-eslint', 'pre-write-main-guard'],
    sources: [
      { label: 'Anthropic — Claude Code hooks documentation', url: DOCS },
      { label: 'Anthropic — Claude Code hooks reference (exit codes & output)', url: DOCS },
    ],
  },
  {
    slug: 'write-your-first-claude-code-hook',
    title: 'Write Your First Claude Code Hook in 5 Minutes',
    metaTitle: 'Write Your First Claude Code Hook (5 Min)',
    description:
      'A step-by-step tutorial: create the hooks folder, write a Bash command logger, register it in settings.json, test it, and watch it run. No deps beyond Node.',
    datePublished: '2026-06-12',
    dateModified: '2026-06-12',
    readingMinutes: 6,
    intro: [
      'This is a hands-on tutorial. In about five minutes you will write a working Claude Code hook from scratch — one that logs every Bash command the agent runs — register it, test it, and watch it fire in a real session.',
      'You need nothing but Node.js, which Claude Code already requires. No npm install, no dependencies. Let’s go.',
    ],
    sections: [
      {
        heading: 'Step 1 — Create the hooks folder',
        body: [
          'Hooks live in `.claude/hooks/` at your project root. Create it:',
          { code: 'mkdir -p .claude/hooks' },
          'That is also where the HookStack CLI installs hooks, so you can mix your own with catalogue hooks freely.',
        ],
      },
      {
        heading: 'Step 2 — Write the hook',
        body: [
          'We will write a PostToolUse hook that logs every Bash command to a file. PostToolUse runs after the tool, so we get the command and its result. Save this as `.claude/hooks/bash-logger.mjs`:',
          {
            code: `// .claude/hooks/bash-logger.mjs
import { readFileSync, appendFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

export function run(input, {
  append = appendFileSync,
  mkdir = mkdirSync,
  projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
  now = () => new Date().toISOString(),
} = {}) {
  const command = input.tool_input?.command ?? ''
  if (!command) return null // not a Bash call with a command — skip

  const dir = join(projectDir, '.claude', 'data')
  mkdir(dir, { recursive: true })

  const entry = { ts: now(), cmd: command.slice(0, 1000) }
  append(join(dir, 'bash-log.jsonl'), JSON.stringify(entry) + '\\n')
  return entry
}

// Entry guard: only runs when executed directly, not when imported by a test.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'))
  run(input)
}`,
          },
          'The logic lives in a pure `run()` function with its side effects (file writes, the clock) injected as defaults — that is what makes it unit-testable. The entry guard at the bottom does the real stdin reading and only runs when the file is executed directly.',
        ],
      },
      {
        heading: 'Step 3 — Register it in settings.json',
        body: [
          'A script on disk does nothing until you wire it to an event. Open (or create) `.claude/settings.json` and add a PostToolUse hook matched to Bash:',
          {
            code: `// .claude/settings.json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node $CLAUDE_PROJECT_DIR/.claude/hooks/bash-logger.mjs"
          }
        ]
      }
    ]
  }
}`,
          },
          'The `matcher` of `"Bash"` means this hook only fires on Bash tool calls. The `$CLAUDE_PROJECT_DIR` prefix makes the path resolve no matter where Claude Code launches from.',
        ],
      },
      {
        heading: 'Step 4 — Test it manually',
        body: [
          'Never trust a hook you have not run. Pipe it the exact JSON Claude Code would send and confirm it behaves:',
          {
            code: `echo '{"tool_name":"Bash","tool_input":{"command":"git status"}}' \\
  | node .claude/hooks/bash-logger.mjs

# Then check the log was written:
cat .claude/data/bash-log.jsonl
# {"ts":"2026-06-12T…","cmd":"git status"}`,
          },
          'If you see the log line, the hook works. If you get a stack trace, fix it here before wiring it into a session — debugging a standalone script is far easier than debugging it live.',
        ],
      },
      {
        heading: 'Step 5 — Watch it run',
        body: [
          'Start Claude Code in the project and ask it to do anything that runs a shell command (“show me the git log”, “list the files”). Every Bash command it runs now appends to `.claude/data/bash-log.jsonl`. Tail it in another terminal to watch the trail build up:',
          { code: 'tail -f .claude/data/bash-log.jsonl' },
          'That is a complete, working hook. The same five steps — folder, script, register, test, run — apply to every hook you will ever write, blocking or not.',
        ],
      },
      {
        heading: 'Want to block something instead of logging?',
        body: [
          'Switch the event to `PreToolUse` and return a block decision instead of writing a file. The structure is identical; only the return value changes:',
          {
            code: `export function run(input) {
  const command = input.tool_input?.command ?? ''
  if (/rm\\s+-rf?\\s+\\//.test(command)) {
    return { decision: 'block', reason: 'rm -rf on an absolute path is blocked.' }
  }
  return null
}`,
          },
          'Register it under `PreToolUse` instead of `PostToolUse`, and have the entry guard write the result to stdout: `if (result) process.stdout.write(JSON.stringify(result))`.',
        ],
      },
      {
        heading: 'Or skip the writing entirely',
        body: [
          'Building hooks by hand is the best way to understand them — but for production guardrails you do not have to. HookStack ships ~90 hooks that are already written, tested, and dogfooded on its own repo. Install a curated set in one command:',
          { code: 'npx hookstack-cli@latest install' },
          'You get the exact code that runs in production, plus the freedom to drop your own hooks alongside them in the same `.claude/hooks/` folder.',
        ],
      },
    ],
    faq: [
      { q: 'Where do I put my Claude Code hook?', a: 'Put the script in .claude/hooks/ at your project root, then register it in .claude/settings.json under the right event (PreToolUse, PostToolUse, Stop, etc.) with a command like node $CLAUDE_PROJECT_DIR/.claude/hooks/your-hook.mjs.' },
      { q: 'Do I need to install anything to write a hook?', a: 'No. Hooks are plain Node.js scripts using only built-in modules (fs, path, child_process). Node is already required by Claude Code, so there is nothing extra to install.' },
      { q: 'How do I test a hook before using it?', a: 'Pipe it a fake payload: echo \'{"tool_name":"Bash","tool_input":{"command":"git status"}}\' | node .claude/hooks/your-hook.mjs and check the output or side effect. This isolates the script from the session.' },
      { q: 'How do I make my hook block an action instead of just reacting?', a: 'Use the PreToolUse event and return { decision: "block", reason: "…" } from run(), then write that JSON to stdout in the entry guard. PostToolUse runs after the action, so it cannot block.' },
    ],
    related: ['what-are-claude-code-hooks', 'claude-code-hooks-not-working', 'pretooluse-vs-posttooluse'],
    relatedHookSlugs: ['post-bash-command-log', 'pre-bash-block-destructive', 'pre-bash-enforce-package-managers', 'pre-bash-secret-detection'],
    sources: [{ label: 'Anthropic — Claude Code hooks documentation', url: DOCS }],
  },
  {
    slug: 'claude-code-settings-json',
    title: 'Claude Code settings.json: The Complete Reference',
    metaTitle: 'Claude Code settings.json: Complete Reference',
    description:
      'A complete reference for Claude Code settings.json: where it lives, hooks and permissions blocks, settings.local.json precedence, env, and common mistakes.',
    datePublished: '2026-06-12',
    dateModified: '2026-06-12',
    readingMinutes: 8,
    intro: [
      'The `settings.json` file is where you configure Claude Code per project and per user — which hooks fire on agent events, which tools run without prompting, and a handful of other keys. If you have ever wondered where Claude Code reads its configuration from, why a hook silently does nothing, or how `settings.local.json` differs from `settings.json`, this is the file you need to understand.',
      'This guide walks through what goes in `settings.json`, the three locations it can live in and how they merge, the structure of the `hooks` and `permissions` blocks, how to set environment variables, the mistakes that quietly break a config, and how to keep the file under control across a team.',
    ],
    sections: [
      {
        heading: 'What is the .claude/settings.json file and what goes in it?',
        body: [
          '`settings.json` is Claude Code’s configuration file, written as plain JSON. Each top-level key controls one area of behaviour. The keys you will use most often are:',
          {
            list: [
              '`hooks` — scripts that run automatically on lifecycle events such as `PreToolUse`, `PostToolUse`, `SessionStart`, and `Stop`.',
              '`permissions` — `allow`, `deny`, and `ask` lists that decide which tool calls run without a prompt, which are blocked, and which require confirmation.',
              '`env` — environment variables exported into the session and into the processes your hooks spawn.',
              '`model` — an override for which model the session uses, when you want to pin it rather than rely on the default.',
            ],
          },
          'A minimal file is just an object with the keys you care about. Everything you omit falls back to Claude Code’s defaults, so it is normal for a project to ship a `settings.json` that only defines `hooks` and `permissions`.',
        ],
      },
      {
        heading: 'Where is Claude Code settings.json located?',
        body: [
          'There are three locations, each with a different scope. Claude Code reads all of them and merges the result:',
          {
            list: [
              'Project — `.claude/settings.json` at the repository root. Committed to git and shared with the whole team. This is where your project’s hooks and shared permissions belong.',
              'Local — `.claude/settings.local.json`, also at the repository root but gitignored. Personal overrides that should never reach your teammates, such as machine-specific paths or experimental permissions.',
              'User — `~/.claude/settings.json` in your home directory. Global defaults that apply to every project you open on this machine.',
            ],
          },
          'So the short answer to "where is Claude Code settings" is: per-project in `.claude/`, per-user in `~/.claude/`, plus a gitignored `.claude/settings.local.json` for personal tweaks.',
        ],
      },
      {
        heading: 'How do settings.local.json and settings.json merge?',
        body: [
          'The three files are merged, not replaced. The more specific location wins on conflicting keys: local overrides project, and project overrides user. In other words `settings.local.json` has the final say, then the committed project `settings.json`, then your global `~/.claude/settings.json`.',
          'This is exactly the difference between `settings.local.json` and `settings.json`: the project file is the shared, committed baseline for the team, while the local file is your personal, gitignored layer on top. Put anything the team depends on in `settings.json`, and anything that is just for you — or that contains a secret — in `settings.local.json`.',
        ],
      },
      {
        heading: 'How is the hooks block structured?',
        body: [
          'The `hooks` block is keyed by event name. Each event holds an array of matcher groups; each group has a `matcher` (the tool name pattern it applies to) and a `hooks` array of commands to run. The nesting is event → matcher group → command:',
          {
            code: `{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node $CLAUDE_PROJECT_DIR/.claude/hooks/guard-bash.mjs"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node $CLAUDE_PROJECT_DIR/.claude/hooks/format-on-write.mjs"
          }
        ]
      }
    ]
  }
}`,
          },
          'The `matcher` is a pattern against the tool name — `"Bash"` for one tool, `"Write|Edit"` for several, `"*"` for every tool. The referenced script is a Node `.mjs` file: a pure `export function run(input, deps)` holding the logic, plus an entry guard `if (process.argv[1] === fileURLToPath(import.meta.url)) { ... }` that reads the event JSON from stdin and runs it. Block decisions go to stdout; logs and diagnostics go to stderr.',
        ],
      },
      {
        heading: 'How does the permissions block work?',
        body: [
          'The `permissions` block decides, ahead of time, which tool calls need your confirmation. It holds three lists:',
          {
            list: [
              '`allow` — tool calls that run without prompting. Use it for the commands you already trust, like `Bash(git status)` or read-only operations.',
              '`deny` — tool calls that are blocked outright, regardless of anything else.',
              '`ask` — tool calls that always require an explicit confirmation, even if they would otherwise be allowed.',
            ],
          },
          {
            code: `{
  "permissions": {
    "allow": ["Bash(git status)", "Bash(pnpm test)", "Read"],
    "deny": ["Bash(rm -rf:*)"],
    "ask": ["Bash(git push:*)"]
  }
}`,
          },
          'A well-tuned `allow` list is the single biggest reducer of approval friction: the operations you run constantly stop interrupting you, while `deny` and `ask` keep a guard on the dangerous ones. Keep team-wide rules in the project file and personal additions in `settings.local.json`.',
        ],
      },
      {
        heading: 'How do you set environment variables and the model?',
        body: [
          'The `env` key takes an object of string key/value pairs. Those variables are exported into the Claude Code session and are visible to the processes your hooks spawn, which makes `env` the right place for non-secret configuration your hooks read:',
          {
            code: `{
  "env": {
    "NODE_ENV": "development",
    "HOOKSTACK_LOG_LEVEL": "info"
  },
  "model": "claude-opus-4-8"
}`,
          },
          'The `model` key pins the session to a specific model instead of the default. Treat both keys as optional: only add them when you have a concrete reason, and prefer `settings.local.json` for anything machine-specific. Do not put secrets such as API tokens directly in a committed `settings.json` — keep them in the local file or in your real shell environment.',
        ],
      },
      {
        heading: 'What are the common settings.json mistakes?',
        body: [
          'Most "my hook isn’t running" reports trace back to one of these:',
          {
            list: [
              'Invalid JSON. A trailing comma or a missing brace makes the whole file unparseable, and the config is silently ignored — hooks and permissions both stop applying with no obvious error.',
              'Wrong file location. The file must be `.claude/settings.json` at the repo root, not in a subdirectory or your home folder when you meant it to be project-scoped.',
              'Relative command paths. A bare `node .claude/hooks/x.mjs` breaks when the working directory differs. Always anchor with `$CLAUDE_PROJECT_DIR`, as in `node $CLAUDE_PROJECT_DIR/.claude/hooks/x.mjs`.',
              'Committed secrets. Tokens in a project `settings.json` end up in git history. Keep them in `settings.local.json` (gitignored) or in your shell environment via `env` indirection.',
            ],
          },
          'Validate the JSON before you trust it — this prints the parsed object or a precise parse error:',
          {
            code: `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('valid')"`,
          },
        ],
      },
      {
        heading: 'How do you keep settings.json under control on a team?',
        body: [
          'The split between the two files is what keeps a shared config sane:',
          {
            list: [
              'Commit `.claude/settings.json` so every contributor gets the same hooks and the same baseline `permissions` the moment they clone the repo.',
              'Add `.claude/settings.local.json` to `.gitignore` so personal overrides and secrets never get pushed.',
              'Audit changes to the committed file in review — a new `allow` entry or a new hook command is a meaningful change in what runs automatically, and deserves the same scrutiny as code.',
            ],
          },
          'If you would rather not hand-edit the JSON, HookStack’s CLI does it for you: `npx hookstack-cli@latest install` patches your `settings.json` with the hooks you selected and writes the matching scripts into `.claude/hooks/`, so the config and the code stay consistent.',
        ],
      },
    ],
    faq: [
      { q: 'Where is the Claude Code settings.json file?', a: 'Project settings live in `.claude/settings.json` at the repository root, personal gitignored overrides in `.claude/settings.local.json`, and global defaults in `~/.claude/settings.json` in your home directory.' },
      { q: 'What is the difference between settings.local.json and settings.json?', a: '`settings.json` is the committed, team-shared config; `settings.local.json` is a gitignored personal layer that overrides it. Local wins over project, and project wins over the user-level file.' },
      { q: 'Why are my Claude Code hooks defined in settings.json not running?', a: 'The most common cause is invalid JSON — a trailing comma or missing brace makes the file unparseable and silently ignored. Validate it with a JSON parser, and make sure command paths use `$CLAUDE_PROJECT_DIR`.' },
      { q: 'Should I commit settings.json to git?', a: 'Yes, commit `.claude/settings.json` so the team shares the same hooks and permissions. Keep secrets and personal tweaks in `.claude/settings.local.json`, which should be gitignored.' },
    ],
    related: ['what-are-claude-code-hooks', 'write-your-first-claude-code-hook', 'claude-code-hooks-not-working'],
    relatedHookSlugs: ['config-change-audit-log', 'instructions-loaded-audit-log', 'permission-request-auto-allow-readonly', 'user-prompt-inject-conventions'],
    sources: [{ label: 'Anthropic — Claude Code hooks documentation', url: DOCS }],
  },
  {
    slug: 'claude-code-hooks-examples',
    title: '10 Claude Code Hooks Worth Installing (With Examples)',
    metaTitle: '10 Claude Code Hooks Examples Worth Installing',
    description:
      'A curated list of useful Claude Code hooks examples: block secrets and destructive commands, lint on save, run tests on stop, and inject conventions.',
    datePublished: '2026-06-12',
    dateModified: '2026-06-12',
    readingMinutes: 8,
    intro: [
      'Claude Code hooks are shell or Node scripts that fire on lifecycle events — before a tool runs, after a file is written, when the agent finishes. They turn vague intentions like “don’t touch main” or “always run the tests” into deterministic rules the agent cannot skip. The hard part is not the mechanism; it is knowing which hooks are actually worth the wiring.',
      'This is an opinionated roundup of eight hooks that pay for themselves on the first session, drawn from the HookStack catalogue. Each one names the event it binds to and the concrete outcome it buys you. You can install any of them in a minute with the HookStack CLI, covered at the end.',
    ],
    sections: [
      {
        heading: 'Why install hooks instead of writing them?',
        body: [
          'You can write any of these yourself — a hook is just a script wired into `.claude/settings.json`. The reason to install from a catalogue is that the edge cases are already handled: correct exit-code semantics, the right `decision`/`reason` shape on stdout, extension filtering so heavy tools don’t run on every file, and timeouts so a hook never hangs your session.',
          'Installing also keeps the executable script and its settings entry in sync. The CLI writes the script to `.claude/hooks/` and patches `settings.json` for you, so you avoid the most common failure mode: a hook that is on disk but never registered, or registered against the wrong event.',
        ],
      },
      {
        heading: 'Block a leaked secret before a shell command runs',
        body: [
          'This `PreToolUse` hook inspects the command the agent is about to run and blocks it if it contains something that looks like a credential — an API key, a token, an `AWS_SECRET` value pasted inline. Instead of the secret reaching your shell history or a remote service, the tool call is rejected with an actionable reason.',
          { list: ['Event: `PreToolUse` (matcher `Bash`)', 'Outcome: a command carrying a secret never executes.'] },
        ],
      },
      {
        heading: 'Stop a disk-wiping command like rm -rf',
        body: [
          'The single most expensive mistake an agent can make is a destructive shell command. This `PreToolUse` hook pattern-matches the proposed `Bash` command against known-dangerous shapes (`rm -rf`, `git reset --hard` on dirty trees, `dd` to a device, recursive `chmod`) and returns `{ decision: \'block\' }` before anything runs. It earns its place by being the one rule you never want to rely on a prompt to enforce.',
        ],
      },
      {
        heading: 'Refuse edits on main until you branch',
        body: [
          'A `PreToolUse` guard that checks the current git branch before any `Write` or `Edit` is applied. If you are on `main` (or `master`), it blocks the edit and tells the agent to create a feature branch first. This keeps experimental agent work off your protected branch without you having to remember to branch every session.',
          { list: ['Event: `PreToolUse` (matcher `Write|Edit`)', 'Outcome: no file changes land on `main` by accident.'] },
        ],
      },
      {
        heading: 'Lint and fix every file the moment it is written',
        body: [
          'This `PostToolUse` hook runs ESLint with `--fix` on each file the agent writes or edits, filtered to JavaScript and TypeScript extensions so it stays fast. Style and trivially fixable errors are corrected immediately, which means the agent works against already-clean files instead of accumulating a lint debt you discover at commit time. Being a `PostToolUse` hook, it is non-blocking: if ESLint is not installed, it stays silent.',
        ],
      },
      {
        heading: 'Run the test suite when Claude says it is done',
        body: [
          'A `Stop` hook fires when the agent finishes a turn. This one runs your test command at that moment, so “I’m done” is verified rather than trusted. If tests fail, the result is surfaced back into the session and the agent keeps working instead of leaving you with a red suite. It is the cheapest way to close the gap between an agent claiming success and the code actually passing.',
          { list: ['Event: `Stop`', 'Outcome: every completed turn ends on a green (or visibly red) test run.'] },
        ],
      },
      {
        heading: 'Inject your project conventions on every prompt',
        body: [
          'A `UserPromptSubmit` hook runs each time you send a message and prepends context to it — your naming conventions, the packages you forbid, the way you structure modules. Rather than repeating house rules in every prompt or hoping they survive in `CLAUDE.md`, you inject them deterministically at the moment they matter, so the agent reads them on every single turn.',
        ],
      },
      {
        heading: 'Load git repo state at session start',
        body: [
          'A `SessionStart` hook runs once when a session begins and feeds the agent the current git context: the branch, recent commits, and the working-tree status. The agent opens already knowing where it is in history, so it stops re-discovering the repo state with redundant `git` calls and avoids acting on stale assumptions about what changed.',
          { list: ['Event: `SessionStart`', 'Outcome: the agent starts oriented, not blind.'] },
        ],
      },
      {
        heading: 'Ping Slack when the agent needs you',
        body: [
          'A `Notification` hook fires when Claude Code raises a notification — typically when it is waiting on you for permission or input. This one posts to a Slack webhook so you can step away from a long-running session and get pulled back exactly when the agent is blocked, instead of babysitting the terminal.',
        ],
      },
      {
        heading: 'How do you install these?',
        body: [
          'Every hook above is in the HookStack catalogue. The fastest path is the CLI: pick a stack or individual hooks on hookstack.app, copy the generated command, and run it in your project. A minimal install looks like this.',
          { code: `npx hookstack-cli@latest install` },
          'The CLI writes each selected script into `.claude/hooks/` and patches your `.claude/settings.json` so the hook is registered against the correct event and matcher. Your existing settings and `permissions` are preserved — it merges, it does not overwrite. A registered entry looks like the following, pointing at the script the CLI just wrote.',
          { code: `{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "node $CLAUDE_PROJECT_DIR/.claude/hooks/pre-bash-block-destructive.mjs" }
        ]
      }
    ]
  }
}` },
          'After installing, open a new session so the hooks load, and confirm them with a harmless test — for example, ask the agent to run a blocked command and watch the `PreToolUse` guard reject it.',
        ],
      },
    ],
    faq: [
      { q: 'What are the best Claude Code hooks to start with?', a: 'Begin with the safety hooks — secret detection and destructive-command blocking on `PreToolUse` — because they prevent irreversible mistakes. Then add a `Stop` hook that runs your tests and a `PostToolUse` linter so quality is enforced automatically rather than reviewed manually.' },
      { q: 'Do hooks slow down Claude Code?', a: 'Well-written hooks are negligible. `PreToolUse` hooks do cheap pattern matching, and `PostToolUse` tools like ESLint should filter by file extension so they only run on relevant files. Always set an explicit timeout so a hook can never hang the session.' },
      { q: 'Can a hook actually stop Claude from doing something?', a: 'Yes, but only `PreToolUse` hooks. They run before a tool executes and can return `{ decision: \'block\', reason: \'…\' }` on stdout to reject the call. `PostToolUse`, `Stop`, and `SessionStart` hooks react or inject context but cannot retroactively undo a completed action.' },
      { q: 'Where do installed hooks live?', a: 'Scripts go in your project’s `.claude/hooks/` directory and are referenced from `.claude/settings.json` via `$CLAUDE_PROJECT_DIR`. The HookStack CLI writes both, so the script on disk and its registration stay in sync.' },
    ],
    related: ['what-are-claude-code-hooks', 'write-your-first-claude-code-hook', 'secure-claude-code-with-hooks'],
    relatedHookSlugs: ['pre-bash-secret-detection', 'pre-write-main-guard', 'post-write-eslint', 'stop-run-tests', 'user-prompt-inject-conventions', 'session-start-load-git-context', 'notification-slack', 'pre-bash-block-destructive'],
    sources: [{ label: 'Anthropic — Claude Code hooks documentation', url: DOCS }],
  },
  {
    slug: 'secure-claude-code-with-hooks',
    title: 'How to Secure Claude Code with Hooks',
    metaTitle: 'How to Secure Claude Code with Hooks',
    description:
      'Secure Claude Code with deterministic hooks: block destructive commands, prevent secrets leaking, protect .env, and guard the main branch every run.',
    datePublished: '2026-06-12',
    dateModified: '2026-06-12',
    readingMinutes: 8,
    intro: [
      'Claude Code is an agent that runs shell commands and edits files in your repository. That is exactly what makes it useful, and exactly what makes it worth constraining. A single misread instruction can turn into an `rm -rf`, a committed API key, or a force-push to `main`. You want the productivity without handing the agent unconditional write access to your machine.',
      'The strongest control you have is the hook system. A `PreToolUse` hook runs before every tool call and can block it deterministically — the model does not get a vote. This guide walks through the concrete guardrails that matter most: blocking dangerous commands, stopping secret leaks, protecting sensitive files, and defending your default branch. Each one is a small, testable script you can install and read in full.',
    ],
    sections: [
      {
        heading: 'Why do you need security guardrails for an AI coding agent?',
        body: [
          'The agent decides what to do from natural language. Most of the time it gets it right, but "most of the time" is not a security boundary. When you ask it to clean up a directory, the difference between deleting build artifacts and deleting your home folder is one path the model inferred under uncertainty.',
          'You might reach for `CLAUDE.md` and write "never run destructive commands". That instruction is probabilistic — it is one more piece of context competing for the model’s attention, and it can be misread, deprioritized, or simply lost in a long session. A hook is different. It is code that runs every time the matching tool fires, before the action happens, and its verdict is final.',
          'The practical takeaway: put intent in `CLAUDE.md`, but put enforcement in hooks. A `PreToolUse` guard is deterministic — it runs on every call and the model cannot skip it.',
        ],
      },
      {
        heading: 'How do you block destructive shell commands?',
        body: [
          'Shell access is the highest-leverage risk surface, so it gets the first guard. A `PreToolUse` hook with the matcher `Bash` inspects every command the agent wants to run and returns `{ decision: \'block\', reason: \'…\' }` to stop it. Filter on `tool_name` first, then match the dangerous patterns you care about — recursive force-deletes, piping a remote script straight into a shell, disk-wipe utilities.',
          {
            code: `import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const DANGEROUS = [
  /rm\\s+-rf?\\s+(\\/|~|\\$HOME)/,
  /:\\(\\)\\s*\\{.*\\};:/,
  /\\b(mkfs|dd)\\b/,
  /curl[^|]*\\|\\s*(sh|bash)/
]

export function run(input) {
  if (input.tool_name !== 'Bash') return null
  const command = input.tool_input?.command ?? ''
  for (const pattern of DANGEROUS) {
    if (pattern.test(command)) {
      return { decision: 'block', reason: 'Blocked a potentially destructive shell command. Run it manually if you are certain.' }
    }
  }
  return null
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'))
  const result = run(input)
  if (result) process.stdout.write(JSON.stringify(result))
}`,
          },
          'The matcher `Bash` is the key detail: this hook only ever sees `Bash` tool calls, so it stays cheap and focused. Returning `null` lets everything else through unchanged.',
        ],
      },
      {
        heading: 'How do you stop secrets from leaking?',
        body: [
          'Secrets leak two ways: the agent echoes a credential into a shell command, or it writes one into a file you commit. A single `PreToolUse` hook can cover both by registering against `Bash` for command inspection and `Write|Edit` for file content. Scan the relevant payload against a small set of high-signal patterns and block on a match.',
          {
            code: `import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const SECRETS = [
  /sk-[a-zA-Z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /ghp_[a-zA-Z0-9]{36}/,
  /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
  /xox[baprs]-[a-zA-Z0-9-]{10,}/
]

export function run(input) {
  const text =
    input.tool_name === 'Bash'
      ? input.tool_input?.command ?? ''
      : input.tool_input?.content ?? input.tool_input?.new_string ?? ''
  if (!text) return null
  for (const pattern of SECRETS) {
    if (pattern.test(text)) {
      return { decision: 'block', reason: 'A value matching a secret pattern was detected. Use an environment variable or a secrets manager instead.' }
    }
  }
  return null
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'))
  const result = run(input)
  if (result) process.stdout.write(JSON.stringify(result))
}`,
          },
          'Wire it to both events in `settings.json` so it covers the full surface: the matcher `Bash` catches `echo $TOKEN` or `export KEY=…`, and the matcher `Write|Edit` catches a key being written into source. Pattern lists are never exhaustive, so treat this as a tripwire that catches the common shapes, not a guarantee.',
        ],
      },
      {
        heading: 'How do you protect sensitive files like .env?',
        body: [
          'Some files should never be in the agent’s working set at all. A `PreToolUse` hook on `Read` and `Edit` can block any access to `.env`, private keys, and credential files, so a secret never even enters the model’s context — which is the cleanest way to prevent it from being echoed or copied later.',
          {
            code: `import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const PROTECTED = [
  /(^|\\/)\\.env(\\.|$)/,
  /\\.pem$/,
  /(^|\\/)id_(rsa|ed25519)$/,
  /(^|\\/)credentials(\\.json)?$/
]

export function run(input) {
  if (!['Read', 'Edit'].includes(input.tool_name)) return null
  const path = input.tool_input?.file_path ?? ''
  if (PROTECTED.some((p) => p.test(path))) {
    return { decision: 'block', reason: 'Access to this file is blocked to keep secrets out of the agent context.' }
  }
  return null
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'))
  const result = run(input)
  if (result) process.stdout.write(JSON.stringify(result))
}`,
          },
          'You can extend the same idea to lockfiles and CI configuration when you want the agent to read source but not silently rewrite the files that govern your builds.',
        ],
      },
      {
        heading: 'How do you protect the main branch?',
        body: [
          'Two failure modes hit the default branch: the agent edits files while `main` is checked out, and the agent pushes directly to `main`. Both are easy to gate with hooks. A `PreToolUse` guard on `Write|Edit` can read the current branch with `git rev-parse --abbrev-ref HEAD` and block writes until a feature branch exists.',
          'A separate `Bash` guard inspects the command and blocks any `git push` whose target is `main` or `master`, including `--force` variants. Always pass a `timeout` to `execSync` so a hung `git` call cannot stall the session.',
          {
            list: [
              'Block writes on `main`: nudge the agent to create a branch first, so no change lands on the protected branch by accident.',
              'Block `git push origin main`: a push is irreversible in a way a local edit is not, so it deserves its own deterministic gate.',
              'Allow everything on feature branches: the guards return `null` once you are off `main`, staying out of the way during normal work.',
            ],
          },
        ],
      },
      {
        heading: 'How do you keep secrets off the screen during a demo or screen-share?',
        body: [
          'Security is not only about what the agent does — it is also about what ends up on your screen while you record a demo or pair over a call. A hook that runs when messages are displayed can redact values matching secret patterns before they render, replacing them with a placeholder like `[REDACTED]`.',
          'This does not stop a leak at the source, so pair it with the file and command guards above. Its job is narrow and worth it: a token that scrolls past during a screen-share is a real disclosure, and redacting the display closes that specific gap.',
        ],
      },
      {
        heading: 'How do these compose into a security baseline, and how do you install them?',
        body: [
          'Each hook is small and single-purpose, and together they form layered defense: command blocking, secret scanning, file protection, branch guards, and display redaction. No single one is sufficient, but stacked they cover the realistic ways an agent causes harm. This is defense-in-depth, not a replacement for reviewing what the agent actually does — hooks catch the patterns you anticipated, your attention catches the rest.',
          'HookStack groups these under the security category so you do not have to assemble them by hand. Select the guards you want from the catalogue, then install the whole stack in one step:',
          {
            code: `npx hookstack-cli@latest install`,
          },
          'The command writes the hooks into `.claude/hooks/` and wires the matchers into your `settings.json`. From the next session on, every matching tool call passes through your guards before it runs — deterministically, with no instruction for the model to forget.',
        ],
      },
    ],
    faq: [
      { q: 'Can the model disable or skip a PreToolUse hook?', a: 'No. Hooks are configured in `settings.json` and executed by Claude Code itself, not by the model. A `PreToolUse` guard runs before every matching tool call, and its `block` decision is final regardless of what the model intends.' },
      { q: 'Is a CLAUDE.md instruction enough to keep the agent safe?', a: 'No. Instructions in `CLAUDE.md` are probabilistic context the model may misread or deprioritize. Use it to express intent, but enforce hard limits with deterministic `PreToolUse` hooks that run every time.' },
      { q: 'Do these hooks replace code review?', a: 'No. Hooks are defense-in-depth: they block the dangerous patterns you anticipated. You still need to review what the agent changed, because no pattern list covers every way an action can go wrong.' },
      { q: 'Will secret-detection hooks slow down my session?', a: 'No meaningfully. The hooks filter on `tool_name` first and run a handful of regular expressions against a single payload, so the overhead per tool call is negligible compared to the model and tool latency.' },
    ],
    related: ['what-are-claude-code-hooks', 'pretooluse-vs-posttooluse', 'claude-code-hooks-examples'],
    relatedHookSlugs: ['pre-bash-block-destructive', 'pre-bash-secret-detection', 'pre-write-secret-detection', 'pre-edit-protect-paths', 'pre-read-env-guard', 'pre-bash-guard-git-push-main', 'pre-write-main-guard', 'message-display-redact-secrets'],
    sources: [{ label: 'Anthropic — Claude Code hooks documentation', url: DOCS }],
  },
]

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug)
}
