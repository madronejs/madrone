/**
 * @module Watcher
 *
 * Watches reactive expressions and runs callbacks when they change.
 */

import { WatcherOptions } from '@/interfaces';
import Observer from './Observer';

/**
 * Watches a reactive expression and calls a handler when its value changes.
 *
 * The getter function is called immediately to establish dependencies.
 * Whenever any reactive property accessed within the getter changes,
 * the function re-runs and the handler is called with the new and old values.
 *
 * @typeParam T - The type of the watched value
 * @param get - Function that returns the value to watch. All reactive
 *              properties accessed become dependencies.
 * @param handler - Callback invoked when the watched value changes
 * @param options - Optional configuration
 * @param options.immediate - If true, calls handler immediately with current value
 * @returns A disposer function that stops watching when called
 *
 * @example
 * ```ts
 * import { Reactive, Watcher } from 'madrone/reactivity';
 *
 * const state = Reactive({ count: 0 });
 *
 * // Watch a single property
 * const stop = Watcher(
 *   () => state.count,
 *   (newVal, oldVal) => console.log(`Count: ${oldVal} → ${newVal}`)
 * );
 *
 * state.count = 5; // logs: "Count: 0 → 5"
 * stop(); // Stop watching
 * ```
 *
 * @example
 * ```ts
 * // Watch a computed expression
 * const stop = Watcher(
 *   () => state.items.filter(i => i.active).length,
 *   (count) => console.log(`${count} active items`)
 * );
 * ```
 *
 * @example
 * ```ts
 * // Immediate execution
 * Watcher(
 *   () => state.count,
 *   (val) => console.log(`Count is ${val}`),
 *   { immediate: true }
 * );
 * // Immediately logs: "Count is 0"
 * ```
 */
export default function Watcher<T>(
  get: () => T,
  handler: (val?: T, old?: T) => unknown,
  options?: WatcherOptions
): () => void {
  const obs = Observer({
    get,
    onChange: ({ value, prev }) => handler(value, prev),
  });

  // run the observer immediately to get the dependencies
  const val = obs.run();

  if (options?.immediate) {
    handler(val);
  }

  // return disposer to stop watching
  return () => obs.dispose();
}
