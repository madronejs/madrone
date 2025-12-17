/**
 * @module Reactive
 *
 * Core reactivity primitive that wraps objects in reactive Proxies.
 */

import typeHandlers from './typeHandlers';
import {
  addReactive, isReactiveTarget, isReactive, getReactive,
} from './global';
import { ReactiveOptions } from './interfaces';

/**
 * Wraps an object in a reactive Proxy that tracks property access and mutations.
 *
 * When properties are read, they become dependencies of any active Observer.
 * When properties are written, all dependent Observers are notified to update.
 *
 * Supports objects, arrays, Maps, and Sets. By default, reactivity is deep -
 * nested objects are also wrapped in Proxies when accessed.
 *
 * @typeParam T - The type of object being made reactive
 * @param target - The object to make reactive
 * @param options - Configuration options for reactive behavior
 * @returns A reactive Proxy wrapping the target object
 *
 * @example
 * ```ts
 * import { Reactive, Watcher } from 'madrone/reactivity';
 *
 * const state = Reactive({ count: 0, nested: { value: 1 } });
 *
 * // Watcher tracks `count` as a dependency
 * Watcher(
 *   () => state.count,
 *   (val) => console.log(`Count: ${val}`)
 * );
 *
 * state.count = 5; // Triggers watcher
 * state.nested.value = 2; // Also reactive (deep by default)
 * ```
 *
 * @example
 * ```ts
 * // With Maps and Sets
 * const set = Reactive(new Set([1, 2, 3]));
 * const map = Reactive(new Map([['key', 'value']]));
 *
 * // All operations are reactive
 * set.add(4);
 * map.set('newKey', 'newValue');
 * ```
 */
export default function Reactive<T extends object>(target: T, options?: ReactiveOptions<T>): T {
  // if we've already made an Reactive from the target, return the existing one
  if (isReactiveTarget(target)) return getReactive(target);

  // this is already a proxied target... don't need to track it again
  if (isReactive(target)) return target;

  const opts = options || {};
  const newOptions = { ...opts, deep: opts?.deep ?? true };
  const type = Reactive.getStringType(target);

  // make sure we're looking at something we can observe
  // if not, return the original
  if (!Reactive.hasHandler(type)) return target;

  const proxy = new Proxy(target, Reactive.typeHandler(type, newOptions)) as T;

  addReactive(target, proxy);

  return proxy;
}

/**
 * Gets the type string for an object (e.g., 'object', 'array', 'set', 'map').
 * @internal
 */
Reactive.getStringType = (obj: unknown): string => Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();

/**
 * Checks if a handler exists for the given type.
 * @internal
 */
Reactive.hasHandler = (type: string): boolean => !!typeHandlers[type];

/**
 * Gets the Proxy handler for the given type.
 * @internal
 */
Reactive.typeHandler = (type: string, hooks: ReactiveOptions): ProxyHandler<object> => typeHandlers[type]?.(hooks);
