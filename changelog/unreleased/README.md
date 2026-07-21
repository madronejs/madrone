# Unreleased changelog fragments

Each notable change gets its own markdown file in this folder. At release time the fragments are compiled into `CHANGELOG.md` and deleted — see [RELEASING.md](../../RELEASING.md) for the full release process.

## Format

One entry per file, named however you like (e.g. `fix-observer-deps.md`):

```markdown
---
type: Fixed
text: "Observer no longer clears dependencies when reactive objects are created during a computed's execution."
---
```

- `type` must be one of: `Breaking`, `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
- `text` is a single-line description; surrounding quotes are optional. Inline markdown (backticks, bold) is fine.
- A PR with multiple notable changes adds multiple files.

This README is ignored by the compiler.
