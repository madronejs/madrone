/**
 * @module global
 *
 * Global state management for Madrone integrations and reactive object tracking.
 *
 * Madrone uses a plugin architecture where "integrations" provide the actual
 * reactivity implementation. This module manages the global integration registry
 * and provides utilities for tracking object access patterns.
 */

import { Integration } from '@/interfaces';

// /////////////////////////////////
// INTEGRATIONS
// /////////////////////////////////

const GLOBAL_INTEGRATIONS = new Set<Integration>();
let CURRENT_INTEGRATION: Integration;

/**
 * Returns all currently registered integrations.
 *
 * Integrations are the pluggable backends that provide reactivity.
 * Multiple integrations can be registered, though typically only one is used.
 *
 * @returns An array of all registered Integration instances
 *
 * @example
 * ```ts
 * import { getIntegrations } from 'madrone';
 *
 * const integrations = getIntegrations();
 * console.log(`${integrations.length} integrations registered`);
 * ```
 */
export function getIntegrations(): Array<Integration> {
  return [...GLOBAL_INTEGRATIONS] as Array<Integration>;
}

function getLastIntegration(): Integration | undefined {
  const integrations = getIntegrations();

  return integrations.at(-1);
}

function setCurrentIntegration(): void {
  CURRENT_INTEGRATION = getLastIntegration();
}

/**
 * Registers a new integration with Madrone.
 *
 * The most recently added integration becomes the active one used by
 * `auto()`, `define()`, and other reactive primitives. Integrations
 * provide methods for creating reactive properties, computed values,
 * and watchers.
 *
 * @param integration - The integration to register
 *
 * @example
 * ```ts
 * import Madrone, { MadroneState } from 'madrone';
 *
 * // Register the built-in state integration
 * Madrone.use(MadroneState);
 *
 * // Or register directly
 * addIntegration(MadroneState);
 * ```
 */
export function addIntegration(integration: Integration): void {
  if (!integration) return;

  GLOBAL_INTEGRATIONS.add(integration);
  setCurrentIntegration();
}

/**
 * Removes a previously registered integration.
 *
 * After removal, the most recently added remaining integration becomes active.
 * If no integrations remain, reactive operations will throw errors.
 *
 * @param integration - The integration to remove
 *
 * @example
 * ```ts
 * import { removeIntegration, MadroneState } from 'madrone';
 *
 * // Remove when switching integrations or cleaning up
 * removeIntegration(MadroneState);
 * ```
 */
export function removeIntegration(integration: Integration): void {
  GLOBAL_INTEGRATIONS.delete(integration);
  setCurrentIntegration();
}

/**
 * Returns the currently active integration.
 *
 * This is the integration that will be used by `auto()`, `define()`,
 * `watch()`, and other reactive primitives. Returns undefined if no
 * integration has been registered.
 *
 * @returns The current active Integration, or undefined if none registered
 *
 * @example
 * ```ts
 * import { getIntegration } from 'madrone';
 *
 * const integration = getIntegration();
 * if (!integration) {
 *   console.warn('No integration configured - call Madrone.use() first');
 * }
 * ```
 */
export function getIntegration(): Integration | undefined {
  return CURRENT_INTEGRATION;
}

// /////////////////////////////////
// STATS
// /////////////////////////////////

const STATS_ACCESS = new WeakMap<object, number>();

/**
 * Unwraps a reactive proxy to get the underlying raw object.
 *
 * When you create reactive state with `auto()` or `Reactive()`, the returned
 * object is actually a Proxy. This function returns the original object
 * without the reactive wrapper, which is useful for:
 * - Comparing object identity
 * - Passing to external libraries that don't work with Proxies
 * - Debugging reactive behavior
 *
 * @typeParam T - The type of the object
 * @param obj - The potentially reactive object to unwrap
 * @returns The raw underlying object without reactive proxy
 *
 * @example
 * ```ts
 * import { auto, toRaw } from 'madrone';
 *
 * const original = { count: 0 };
 * const reactive = auto(original);
 *
 * console.log(reactive === original); // false (reactive is a Proxy)
 * console.log(toRaw(reactive) === original); // true
 * ```
 */
export function toRaw<T extends object>(obj: T): T {
  const getRawItem = getIntegration()?.toRaw ?? ((o: T) => o);

  return getRawItem(obj);
}

/**
 * Records that a reactive object was accessed at the current time.
 *
 * This is called internally by reactive getters to track when objects
 * are read. Used for debugging and performance analysis.
 *
 * @param obj - The object that was accessed
 * @internal
 */
export function objectAccessed(obj: object): void {
  STATS_ACCESS.set(toRaw(obj), Date.now());
}

/**
 * Returns the timestamp of when a reactive object was last accessed.
 *
 * Useful for debugging reactive behavior or implementing features like
 * "last viewed" timestamps without additional tracking code.
 *
 * @param obj - The reactive object to check
 * @returns Unix timestamp (milliseconds) of last access, or undefined if never accessed
 *
 * @example
 * ```ts
 * import { auto, lastAccessed } from 'madrone';
 *
 * const state = auto({ count: 0 });
 *
 * console.log(lastAccessed(state)); // undefined (not accessed yet)
 *
 * const value = state.count; // access the property
 *
 * console.log(lastAccessed(state)); // 1702345678901 (timestamp)
 * ```
 */
export function lastAccessed(obj: object): number | undefined {
  return STATS_ACCESS.get(toRaw(obj));
}
