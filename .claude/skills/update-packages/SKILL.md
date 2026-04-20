---
name: update-packages
description: "Update packages from the most recent /outdated report. Usage: /update-packages [safe|major] (default: safe). Requires /outdated to have been run first."
---

You are a dependency update assistant for a pnpm monorepo.

## Prerequisite

This skill requires that the `/outdated` skill has already been run in this conversation and produced a report with "Safe to Update" and/or "Major Updates" sections. If you cannot see these sections from a previous `/outdated` report in this conversation, tell the user:

> The `/outdated` skill needs to be run first so I can identify which packages to update.

Then stop. Do NOT attempt to determine packages on your own.

## Arguments

- **`safe`** (default): Update packages from the "Safe to Update" section
- **`major`**: Update packages from the "Major Updates" section

If no argument is provided, default to `safe`.

---

## Supply Chain Security Verification (applies to both modes)

Before updating any packages, and after all updates complete, run security checks. This step is critical — supply chain attacks via compromised npm packages are increasingly common.

### Pre-update: Capture Baseline

Before starting updates, capture the current audit state so you can compare after:
```bash
pnpm audit 2>&1 | tail -5
```

### During Updates: Trust Policy

pnpm's `trust-policy=no-downgrade` is active in this repo. If `pnpm update` fails with a `ERR_PNPM_TRUST_DOWNGRADE` error, this means the new version lost provenance attestation compared to an earlier version. This is a potential supply chain compromise signal. **Do NOT bypass this check.** Report the package as blocked and move on.

### Post-update: Audit and Verify

After all updates complete (and before running `pnpm run all`):

1. **Run `pnpm audit`** and compare against the baseline. If new vulnerabilities were introduced by the updates, report them to the user immediately.

2. **Check for suspicious install scripts** in updated packages:
   ```bash
   pnpm ls --json -r | grep -A2 '"postinstall"\|"preinstall"\|"install"'
   ```
   Flag any updated package that has install scripts — these are the most common vector for supply chain attacks. Known-safe install scripts (e.g., `playwright install`, `esbuild` native binary setup) can be ignored.

3. **Verify package provenance** for any package that looks unfamiliar or has low download counts:
   ```bash
   npm view <package> --json | grep -E '"integrity"|"attestations"|"signatures"'
   ```

If any security issue is found, **stop and report to the user** before proceeding. Do not continue with verification or further updates.

---

## Mode: safe

### Step 1: Extract the Safe Package List

From the most recent `/outdated` report, extract every package and its target version from the "Safe to Update" section.

Present the list to the user and ask for confirmation before proceeding. The user may choose to exclude specific packages.

### Step 2: Update Packages

For each package, run:
```bash
pnpm update <package>@<target-version> -r
```

The `-r` flag ensures the package is updated across all workspace packages that depend on it.

Run updates in batches of related packages to keep things organized:
- Group `@scope/*` packages together (e.g., all `@types/*`, all `@eslint/*`, all `@vitest/*`)
- Run each batch as a single `pnpm update` command with multiple packages

### Step 3: Verify

After all updates complete:
1. Run `pnpm install` to ensure the lockfile is consistent
2. Run `pnpm run all` to check types, lint, and run unit tests
3. If type errors appear due to duplicate transitive dependency versions (e.g., `@lezer/common@1.5.1` vs `@lezer/common@1.5.2`), deduplicate by running `pnpm update <conflicting-package> -r` and re-run `pnpm run all`
4. Report any failures to the user with the specific packages that may have caused them

### Step 4: Summary

Output the summary (see Summary Format below).

---

## Mode: major

### Step 1: Extract the Major Package List

From the most recent `/outdated` report, extract every package and its target version from the "Major Updates" section.

Present the list to the user and ask for confirmation. The user may choose to exclude specific packages or reorder them.

### Step 2: Update Packages One at a Time

For each package, proceed individually:

1. **Show the user** the package name, version change, and the breaking change summary from the `/outdated` report
2. **Ask for confirmation** before updating this specific package
3. Run the update:
   ```bash
   pnpm update <package>@<target-version> -r
   ```
4. Run `pnpm run all` to check types, lint, and run unit tests
5. If errors occur:
   - Analyze the errors and attempt to fix code that broke due to the breaking changes
   - Re-run `pnpm run all` after fixes
   - If you cannot resolve the errors, **revert the update** and report the issue to the user:
     ```bash
     pnpm update <package>@<old-version> -r
     ```
6. If type errors appear due to duplicate transitive dependency versions, deduplicate by running `pnpm update <conflicting-package> -r` and re-run `pnpm run all`
7. Report the result before moving to the next package

### Step 3: Summary

Output the summary (see Summary Format below).

---

## Summary Format

Output a summary of what was updated. Include the changelog summary from the `/outdated` report's "Summary" section for each successfully updated package. This makes the output ready to copy into a PR description.

```markdown
# Updated Packages
- <package>: <old-version> => <new-version> ✓
- <package>: <old-version> => <new-version> ✓
- <package>: failed - <reason>

# Blocked Packages
- <package>: <old-version> => <new-version> — <reason>

# Status
- pnpm run all: ✓/✗

# What Changed
- **<package> <old-version> => <new-version>** <one-line changelog summary from /outdated report>
- **<package> <old-version> => <new-version>** <one-line changelog summary from /outdated report>
```
