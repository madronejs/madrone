# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.2] - 2025-12-19

### Changed

- Updated `@eslint/compat` from 1.4.0 to 2.0.0
- Updated `@eslint/eslintrc` from 3.3.1 to 3.3.3
- Updated `@eslint/js` from 9.37.0 to 9.39.2
- Updated `@stylistic/eslint-plugin` from 5.4.0 to 5.6.1
- Updated `@types/lodash` from 4.17.20 to 4.17.21
- Updated `@vitest/coverage-v8` from 3.2.4 to 4.0.16
- Updated `eslint` from 9.37.0 to 9.39.2
- Updated `eslint-plugin-unicorn` from 61.0.2 to 62.0.0
- Updated `globals` from 16.4.0 to 16.5.0
- Updated `happy-dom` from 20.0.0 to 20.0.11
- Updated `typedoc` from 0.28.14 to 0.28.15
- Updated `typescript-eslint` from 8.46.1 to 8.50.0
- Updated `vite` from 7.1.10 to 7.3.0
- Updated `vitest` from 3.2.4 to 4.0.16

### Added

- Added `check-updates` script to check for outdated packages
- Added `check-upgrade` script to interactively upgrade packages
- Comprehensive test coverage for nested Set/Map reactivity:
  - `observer_nested_collections.spec.ts` - 35 tests for Observer with nested collections
  - `decorateNestedCollections.spec.ts` - 34 tests for `@reactive`/`@computed` decorators with collections
  - `testVueCollections.ts` - 32 Vue 3-specific integration tests for collections

### Fixed

- **Vue 3 Integration**: Fixed reactivity for Set and Map collections when Vue directly observes iteration methods. Previously, when Vue tracked `Symbol.iterator` (via spread, `for...of`, `Array.from`), modifications via `add()`, `set()`, or `delete()` would not trigger re-renders. The fix tracks which iteration keys Vue has accessed per target and notifies only those keys on structural changes.
