# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Madrone is an object composition and reactivity framework for JavaScript/TypeScript. It provides reactive state management with support for computed properties, watchers, and integration with Vue 3's reactivity system.

Documentation: https://madronejs.github.io/docs/core/

## Common Commands

```bash
pnpm test              # Run tests in watch mode (vitest)
pnpm test-ci           # Run tests once with coverage
pnpm lint              # Run ESLint on src/
pnpm build             # Build library with Vite
pnpm build-types       # Generate TypeScript declarations
pnpm build-all         # Clean, build, and generate types
```

Run a single test file:
```bash
pnpm test src/reactivity/__spec__/watcher.spec.ts
```

## Architecture

### Core Layers

1. **Reactivity System** (`src/reactivity/`)
   - `Reactive.ts` - Creates reactive proxies for objects/arrays using `Proxy`. Handles deep reactivity by default.
   - `Observer.ts` - The `ObservableItem` class that tracks dependencies and caches computed values. Manages dirty state and change notifications.
   - `Computed.ts` - Factory for creating cached computed properties via Observer
   - `Watcher.ts` - Watches reactive expressions and calls handlers on change
   - `global.ts` - Core dependency tracking infrastructure: proxy/target mappings, observer-to-dependency graphs, and microtask scheduler

2. **Integration Layer** (`src/integrations/`)
   - `MadroneState` - Default integration using Madrone's own reactivity (loaded by default)
   - `MadroneVue3` - Integration that bridges Madrone objects with Vue 3's reactivity system

3. **Public API** (`src/auto.ts`, `src/decorate.ts`, `src/index.ts`)
   - `auto()` - Makes all properties on an object reactive/computed automatically
   - `define()` - Defines a single reactive or computed property
   - `watch()` - Watches reactive expressions
   - `@reactive` / `@computed` - Decorators for class-based usage

### Key Patterns

**Integration System**: Madrone uses a plugin architecture (`Integration` interface in `interfaces.ts`). Integrations define how reactive/computed properties are created. The last added integration becomes active.

```typescript
Madrone.use(MadroneVue3({ reactive, toRaw }));  // Switch to Vue 3 reactivity
Madrone.unuse(integration);                      // Remove integration
```

**Dependency Tracking**: When a computed runs its getter, `getCurrentObserver()` returns the active Observer. Reactive proxies call `dependTracker()` on property access to register dependencies. When reactive values change, `trackerChanged()` marks dependent observers dirty.

**Path Alias**: The codebase uses `@/` as an alias for `./src/` (configured in tsconfig.json and vite.config.ts).

## Test Structure

Tests use Vitest and are colocated in `__spec__` directories:
- `src/__spec__/` - Tests for decorators, merge utility, examples
- `src/reactivity/__spec__/` - Tests for reactive, observer, watcher
- `src/integrations/__spec__/` - Tests for MadroneState and Vue3 integration

## Changelog

All notable changes are documented in `CHANGELOG.md` following the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.
