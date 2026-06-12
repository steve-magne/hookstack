# Product

## Register

brand

## Users

Developers using Claude Code who want their AI agent to behave more deterministically and safely. They build fast ("vibe coding") but need guardrails. Comfortable with CLI tools, Node.js, and open-source workflows — they arrive from GitHub or a blog post, scan quickly for signal that the project is real and maintained, and either install the default stack or browse for specific hooks. They are skeptical of hype and reward precision and honesty.

## Product Purpose

HookStack is a community catalogue of production-ready agentic hooks for Claude Code. A hook is a Node.js script that fires on Claude Code lifecycle events (PreToolUse, PostToolUse, Stop…) to enforce deterministic behavior — blocking a bad write, catching a leaked key, enforcing test coverage before a session closes. The site lets developers discover, configure, and install hooks via one `npx` command. Success = a developer installs a full HookStack in under 60 seconds and their Claude Code sessions become noticeably safer and more reliable.

## Brand Personality

Sharp, trustworthy, nerdy, calm, crafted. The site speaks like a confident senior dev: no exclamation marks, no hype, just evidence. It earns trust through precision (unit-tested hooks, real examples, honest copy) and restraint (nothing decorative without purpose). The tone is understated but not cold — it knows what it is and doesn't need to shout.

## Anti-references

- Generic SaaS landing pages with cream/sand/warm backgrounds and gradient text headlines
- Notion-style friendly roundedness and pastel accents
- Loud developer tools that gamify productivity (XP, streaks, leaderboards)
- Any interface where the brand color is the hero — the hooks are the hero
- Glassmorphism cards and backdrop-filter used decoratively
- Enormous hero metrics boxes (big number + small label + gradient accent)
- Uppercase tracked eyebrows on every section ("ABOUT" · "FEATURES" · "PRICING")

## Design Principles

1. **Practice what you preach.** HookStack dogfoods its own hooks. Every design decision should feel like it came from a developer who values correctness over flash.
2. **Evidence over claims.** Trust is built through specifics: hook count, star count, unit test badges, MIT license. Never assert quality — show it.
3. **Restraint is the premium signal.** In a world of overdressed SaaS, the confident choice is less. Every element on screen either works or it's gone.
4. **Speed is respect.** The 60-second install promise is a design constraint, not just a tagline. The UI must never slow that path down.
5. **Dark is native.** Terminal-native dark mode is where developers live. The design should feel at home there — not "dark mode as a feature", but dark as the ground truth.

## Accessibility & Inclusion

WCAG AA minimum. High-contrast text on dark backgrounds (≥ 4.5:1 for body copy). `prefers-reduced-motion` handled globally via `MotionConfig reducedMotion="user"` (already implemented). No specific user needs beyond standard developer audience defaults.
