# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Vue 3 Integration**: Fixed reactivity for Set and Map collections when Vue directly observes iteration methods. Previously, when Vue tracked `Symbol.iterator` (via spread, `for...of`, `Array.from`), modifications via `add()`, `set()`, or `delete()` would not trigger re-renders. The fix tracks which iteration keys Vue has accessed per target and notifies only those keys on structural changes.

### Added

- Comprehensive test coverage for nested Set/Map reactivity:
  - `observer_nested_collections.spec.ts` - 35 tests for Observer with nested collections
  - `decorateNestedCollections.spec.ts` - 34 tests for `@reactive`/`@computed` decorators with collections
  - `testVueCollections.ts` - 32 Vue 3-specific integration tests for collections
