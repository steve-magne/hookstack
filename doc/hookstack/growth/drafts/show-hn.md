# Show HN — full draft

---

## Title (80 chars max, verified: 72 chars)

Show HN: Hookstack – community catalogue of Claude Code hooks, install in 60s

---

## Submission text (150-250 words)

Claude Code has a hook system — lifecycle events (PreToolUse, PostToolUse, SessionStart, Stop, and 21 others) that let you wire plain Node.js scripts into the agent's execution loop. A hook can block a command before it runs, reformat a file after it's written, or ping you when a long task finishes. No SDK, no agent modification — just events and a JSON config.

The problem: the docs explain the mechanism, but don't ship a library of production-tested hooks. You have to write them from scratch.

Hookstack is the community catalogue for these hooks. Right now it has 90 hooks across 25 lifecycle events — security (block secrets, block destructive commands, protect .env), context (inject git state, load open PRs), validation (run ESLint/Prettier/tsc after edits), and workflow (session changelogs, worktree bootstrap, push guards).

Each hook is a plain .mjs file with a Vitest unit test. CI rejects any hook without 80% coverage. Every hook in the catalogue is active on the Hookstack repo itself — we eat our own cooking.

Install any selection in one command:

  npx hookstack-cli@latest install

The CLI walks you through a summary and security panel before writing anything. Or browse hookstack.app to filter and build your own stack, then copy the generated command.

MIT. Open to contributions. I built this because I kept rewriting the same 5 hooks on every project.

---

## First comment (maintainer, posted within 5 min of submission)

Anticipating the questions I'd ask if I weren't the author:

**"Why not just read the official Claude Code hooks documentation?"**

The docs explain the wire protocol well. What they don't provide is a tested, reusable library. Writing a correct PreToolUse hook — pure logic, injectable deps, proper stdin parsing, right exit codes — takes an hour the first time. Hookstack packages that work so you start from a working example, not a blank file. The catalogue is the gap the docs don't fill.

**"Another catalogue? How is this different from just sharing a gist?"**

Two things that a gist doesn't have: a CLI that patches settings.json correctly (the merge logic for multiple hooks on the same event is non-trivial), and unit tests. Every hook ships with a Vitest test that injects fakes for exec, fs, and time. The CI gate rejects hooks without 80% coverage. I've caught real bugs in my own hooks via this test suite. A gist is a starting point; these are production-ready.

**"Should I trust executing third-party hooks in my Claude Code agent?"**

Fair concern. A few answers: (1) every hook is a plain .mjs you can read in 30 seconds — no minification, no obfuscation, no eval; (2) the CLI shows you a security panel before writing anything, summarising filesystem access, network calls, and shell access; (3) the hooks have no external npm dependencies — only Node built-ins; (4) they're MIT, pinned, and the source is the catalogue. You're not running a bash-curl-pipe; you're installing a readable script. Still: audit anything you run. The install command does not require --dangerously-skip-permissions.

---

## Pre-launch checklist

### Asset readiness (must be green before posting)

- [ ] README opens with "Claude Code hooks" in the first two lines (done in this session)
- [ ] README has a GIF demo — if not, record a 15s terminal recording of `npx hookstack-cli@latest install` running and add it as public/demo-hookstack.gif
- [ ] hookstack.app is live and the catalogue loads without errors
- [ ] GitHub repo description is set and relevant (current: "The community catalogue for Claude Code hooks. Browse -> select -> npx install in 60s." — good, but homepage URL still points to hookstack.vercel.app, not hookstack.app — fix before launch)
- [ ] GitHub topics set: claude-code, hooks, ai-agents, devtools, claude, anthropic (check under repo settings)

### Timing (from channels.md + north-star.md)

- [ ] Post Tuesday, Wednesday, or Thursday — 8-10h ET (HN peak window)
- [ ] Do NOT post on a Friday or weekend (velocity in first 2h is everything for HN ranking)
- [ ] Be available to respond to every comment for at least 2 hours after posting — HN ranking is velocity-sensitive

### Day-of process

1. Have the HN submission form pre-filled and ready (title + URL) — do NOT paste yet
2. Have the first comment text ready to copy-paste immediately after submission
3. Post at the target time
4. Paste first comment within 5 minutes
5. Respond to every comment, even short ones ("good point", "fair criticism") — engagement velocity matters
6. Do NOT ask for upvotes in any comment or DM — this is a banneable offence on HN

### After posting

- [ ] Share the HN thread link on X immediately (not "vote for me" — just "I posted this, curious what the community thinks")
- [ ] Monitor comments.hn.live for real-time comment feed without refreshing HN directly
- [ ] If it hits front page: have the site and CLI ready to handle a traffic spike (Vercel should be fine)
- [ ] Log the result in metrics.log.ndjson (stars delta, HN rank peak, time on front page if any)
