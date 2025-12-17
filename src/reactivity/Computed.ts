/**
 * @module Computed
 *
 * Creates cached, auto-updating computed values from reactive dependencies.
 */

import Observer, { ObservableOptions } from './Observer';

/**
 * Creates a computed value that caches its result and auto-updates when dependencies change.
 *
 * A computed value is defined by a getter function. The result is cached and only
 * recalculated when one of its reactive dependencies changes. This provides efficient
 * derived state that stays in sync with source data.
 *
 * @typeParam T - The type of the computed value
 * @param options - Configuration for the computed value
 * @param options.get - Getter function that computes the value
 * @param options.set - Optional setter function for writable computed values
 * @param options.name - Optional name for debugging
 * @param options.cache - Whether to cache the value (default: true)
 * @returns An ObservableItem with a `.value` property
 *
 * @example
 * ```ts
 * import { Reactive, Computed } from '@madronejs/core';
 *
 * const state = Reactive({ firstName: 'John', lastName: 'Doe' });
 *
 * const fullName = Computed({
 *   get: () => `${state.firstName} ${state.lastName}`,
 *   name: 'fullName'
 * });
 *
 * console.log(fullName.value); // 'John Doe'
 *
 * state.firstName = 'Jane';
 * console.log(fullName.value); // 'Jane Doe' (automatically updated)
 * ```
 *
 * @example
 * ```ts
 * // Writable computed
 * const doubleCount = Computed({
 *   get: () => state.count * 2,
 *   set: (val) => { state.count = val / 2; }
 * });
 *
 * doubleCount.value = 10; // Sets state.count to 5
 * ```
 */
export default function Computed<T>(options: ObservableOptions<T>) {
  return Observer(options);
}
