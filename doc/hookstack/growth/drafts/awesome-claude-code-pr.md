# Awesome-list action plan: two submissions

Both targets identified from recon. Instructions are different for each — read carefully before acting.

---

## 1. hesreallyhim/awesome-claude-code (46 300 stars)

**Status of the Hooks section**: the README is currently being reorganised. The Hooks category exists in the dropdown of the issue template. This is a good window — being early in a rebuilt section earns prominence.

**Process**: NO pull requests. Submissions are made exclusively via a GitHub web UI issue form. The gh CLI cannot be used (the bot rejects it). You must open the browser.

### Submission URL

Open in browser:
https://github.com/hesreallyhim/awesome-claude-code/issues/new?template=recommend-resource.yml

### Field-by-field fill-out

| Field | Value |
|---|---|
| Display Name | Hookstack |
| Category | Hooks |
| Sub-Category | General |
| Primary Link | https://github.com/steve-magne/hookstack |
| Author Name | steve-magne |
| Author Link | https://github.com/steve-magne |
| License | MIT |

**Description** (1-3 sentences, no emojis, no promotional language — follow the list's style):

A community catalogue of 90 production-ready Claude Code hooks covering 25 lifecycle events. Hooks are plain Node.js .mjs scripts with no external dependencies; each ships with a Vitest unit test. Install any selection in one command: npx hookstack-cli@latest install.

**Validate Claims** (how to prove it works):

Run the following in any project directory:
  npx hookstack-cli@latest install --hooks=pre-bash-secret-detection,pre-bash-block-destructive --yes
Then inspect the generated .claude/hooks/ folder and the patched .claude/settings.json. Both files are written; no SDK, no global install required.

**Specific Task(s)**:

Ask Claude Code to run a shell command that includes a pattern matching a common API credential format (e.g., an assignment like ENV_VAR=long-credential-string-here) in a project where pre-bash-secret-detection is installed. Observe that the hook blocks the command before execution with an actionable reason.

**Specific Prompt(s)**:

Tell Claude: "Run a bash command that includes a fake credential assignment, e.g. SOME_API_KEY=dummy-value-longer-than-20-chars". The hook fires and blocks with the message: "Secret potentiel detecte dans la commande."

**Additional Comments**:

The project dogfoods its own hooks — all 90 are active on the hookstack repo itself, validated by CI on every PR. The npm package is hookstack-cli (MIT). The catalogue is browsable at hookstack.app with a filter-and-select UI that generates the install command.

### Key constraints

- Must be at least one week old (repo is well past that).
- Do NOT open a PR — the automated bot will reject it and may penalise the account.
- Do NOT use the gh CLI to submit — browser form only.
- Only one open issue at a time in this repo (check before submitting).
- Respond to any bot or maintainer comments within 48h.

---

## 2. rohitg00/awesome-claude-code-toolkit (2 000 stars, PRs welcome)

**Process**: standard fork -> PR. CONTRIBUTING.md instructions:
- Hooks scripts go in hooks/scripts/ and entries in hooks/hooks.json.
- Update the README table when adding new items.
- Branch naming: feature/your-feature.

For Hookstack the correct section is **Related Awesome Lists** at the bottom of the README — Hookstack is a catalogue, not a single hook script to embed. Minimal, clean PR.

### The line to add — Related Awesome Lists section

Find the "## Related Awesome Lists" section in README.md. Add a row matching the table format already there:

  | [Hookstack](https://github.com/steve-magne/hookstack) | Community catalogue of 90 production-ready Claude Code hooks across 25 lifecycle events. Browse at hookstack.app, install with npx hookstack-cli@latest install. MIT. |

If the existing table has a Stars column, add the current star count. If not, omit it.

### PR title

  Add Hookstack to Related Awesome Lists — community catalogue for Claude Code hooks

### PR body

---
## What

Adds Hookstack (https://github.com/steve-magne/hookstack) to the Related Awesome Lists section.

## Why

Hookstack is a community catalogue of 90 production-tested Claude Code hooks covering 25 lifecycle events (PreToolUse, PostToolUse, SessionStart, Stop, and 21 others). Each hook ships as a plain .mjs with a Vitest unit test — no SDK, no external deps. The CLI (npx hookstack-cli@latest install) patches .claude/hooks/ and settings.json directly. MIT licensed, actively maintained.

It fits the "related awesome lists" framing: a focused domain (hooks) that complements this toolkit's broader scope.

## Checklist

- [x] README table updated
- [x] No new scripts added (catalogue link, not an embedded script)
- [x] Verified no duplicate entry exists
---

### Steps

1.  gh repo fork rohitg00/awesome-claude-code-toolkit --clone
2.  git checkout -b feature/add-hookstack-to-ecosystem
3.  Edit README.md: find "## Related Awesome Lists" and add the table row above.
4.  git add README.md
5.  git commit -m "Add Hookstack to Related Awesome Lists — community catalogue for Claude Code hooks"
6.  git push origin feature/add-hookstack-to-ecosystem
7.  Open PR with the title and body above.

Note: rohitg00's repo has 111 open PRs — the maintainer is active. A focused README-only PR is low-friction and likely to be merged quickly.
