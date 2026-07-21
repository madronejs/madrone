---
name: changelog
description: Add a changelog fragment for the current change. Use when the user asks to "add a changelog", "write a changelog entry", "add a fragment", or when wrapping up a branch/PR whose changes are notable and changelog/unreleased/ has no fragment for them yet.
---

# Add a changelog fragment

Create one or more fragment files in `changelog/unreleased/` describing the current change. Do NOT edit `CHANGELOG.md` directly — it is compiled from fragments at release time (see `scripts/compile-changelog.mjs`).

## Steps

1. Figure out what changed. Prefer the current conversation's context; otherwise diff the branch against main (`git diff main...HEAD --stat` and the commit messages).
2. Decide if it's notable: would a consumer of `@madronejs/core` care? Internal refactors, CI tweaks, and test-only changes usually don't need a fragment. If nothing is notable, say so and stop.
3. For each notable change, write one file in `changelog/unreleased/` (kebab-case name describing the change, e.g. `fix-observer-deps.md`):

   ```markdown
   ---
   type: Fixed
   text: "One-line description of the change."
   ---
   ```

4. Validate by running `pnpm changelog:compile --dry-run` (requires the version in `package.json` to not already have a CHANGELOG.md section; if it does, skip this step — the fragment parser is exercised at release time anyway).
5. Show the user the fragment content in chat.

## Rules

- `type` is exactly one of: `Breaking`, `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
- One entry per file. A change that is both e.g. `Breaking` and `Added` gets two files.
- `text` is a single line. Match the voice of existing `CHANGELOG.md` entries: user-facing, past tense, lead with the affected API in bold when there is one (e.g. `**\`@classMixin\`**: ...`). Describe the consumer-visible behavior, not the implementation.
- Don't duplicate: check existing files in `changelog/unreleased/` first and update an existing fragment if it already covers this change.
