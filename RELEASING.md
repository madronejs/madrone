# Releasing

## During development

Every PR with a notable change adds one or more changelog fragment files to [`changelog/unreleased/`](changelog/unreleased/README.md) — `CHANGELOG.md` is never edited by hand.
A fragment is a small markdown file with a `type` (`Breaking`, `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`) and a one-line `text`; see the folder README for the exact format.

## Cutting a release

1. Run the **Release PR** workflow (Actions → Release PR → Run workflow) and pick the version bump: `patch`, `minor`, or `major` (or `none` if the version in `package.json` was already bumped manually).
   It bumps `package.json`, compiles the fragments into a new `## [X.Y.Z] - date` section at the top of `CHANGELOG.md`, deletes them, and opens a `chore: release X.Y.Z` PR.
2. Review and merge the release PR.
   Note: PRs opened by the workflow's default token don't trigger CI automatically — close and reopen the PR if you want `Validate PR` to run on it.
3. Run the **Publish to npm** workflow (Actions → Publish to npm → Run workflow).
   Default is a dry run; run it once with `dry_run` checked to sanity-check the build, then again unchecked to publish.
   It verifies (`pnpm all`), builds, guards against republishing an existing version, publishes with npm provenance via OIDC trusted publishing, and creates the `vX.Y.Z` tag and GitHub release.

The order matters: publish reads the version from `package.json` on `main`, so it must run after the release PR merges.
Running things out of order fails loudly — publish refuses an already-published version, and the compile step refuses a version that already has a `CHANGELOG.md` section.

## Local equivalents

- `pnpm changelog:compile --dry-run` — preview the section the next release would add, without touching anything.
- `pnpm changelog:compile` — actually compile and delete fragments (what the workflow runs).
- The compile logic lives in [`scripts/compile-changelog.mjs`](scripts/compile-changelog.mjs) and is tested by `scripts/__spec__/compileChangelog.spec.ts`.
