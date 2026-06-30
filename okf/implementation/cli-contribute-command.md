---
type: Playbook
title: CLI contribute — renvoyer un hook modifié en PR
description: Commande npx ... contribute qui pousse une modification locale d'un hook vers le registre upstream via fork + PR.
tags: [implementation, cli, contribution, git]
timestamp: 2026-06-29T00:00:00Z
---

# CLI `contribute` command

## What

A new `npx hookstack-cli@latest contribute` command. Anyone who installed
hooks via the CLI and edited one locally can now push that edit back upstream
as a PR, without leaving the CLI.

## Why this shape

The CLI already tracks a `// @hookstack <slug>` fingerprint in every
installed `.mjs`, and `update` already knows how to diff a local script
against the live registry (`detectScriptChanges`). `contribute` reuses both:
it's the same diff, just read in the opposite direction — "local differs from
registry" means either upstream moved on, or the user edited their copy. We
don't try to disambiguate the two; we just show the candidate(s) and let the
user pick which to send (multiselect, all pre-checked). Disambiguating would
require diffing against git blame/history, which is unnecessary complexity
for a v1.

## Implementation

- `packages/cli/bin/core.mjs`: two pure, unit-tested helpers —
  `buildContributionBranch(slugs)` and `buildContributionPr(slugs)` (branch
  name + PR title/body). Everything else needed (`detectScriptChanges`,
  `findInstalledSlugs`) already existed for `update`.
- `packages/cli/bin/cli`: all the git/GitHub I/O, mirroring the existing
  `install`/`update` split into `interactiveX` (clack prompts) and `directX`
  (`--yes`, CI) variants.
  - `pushContribution(slugs, dirs, log)` does the actual work: checks `gh` is
    installed and authenticated, forks `steve-magne/hookstack` via
    `gh repo fork`, clones the fork into a fresh `mkdtempSync` scratch
    directory, creates a branch, copies the user's local `.mjs` files over
    the fork's `.claude/hooks/`, commits, pushes, and opens the PR with
    `gh pr create`. The scratch dir is always removed in a `finally`.
  - All shell-outs use `execFileSync(cmd, argsArray)` — never a shell string
    — so slugs/titles/branch names can't be interpreted by a shell even
    though they're partly built from registry data.
  - The fork+clone step runs with `cwd: workDir` (an empty temp dir, no
    `.git`), specifically so `gh repo fork` has no git working tree to touch
    — it can't rename or repoint a remote in the *user's own* project by
    accident.
  - "Nothing to push" (fork already has byte-identical content) is detected
    via `git diff --cached --quiet` after staging, and short-circuits before
    any commit/push/PR call.
- Both README files (root + `packages/cli/README.md`) got a "Contributing
  changes back" section mirroring the existing "Updating" section, per this
  repo's rule that the two READMEs must stay in sync.

## Explicitly out of scope (v1)

- No pre-check for "does a fork already exist" — `gh repo fork` is already
  idempotent, so skipping the check is strictly fewer calls for the same
  result.
- No website/`doc/product` changes — this is a CLI-only mechanic, nothing in
  the catalogue UI or product docs references it.
