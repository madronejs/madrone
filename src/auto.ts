import { getIntegration } from '@/global';
import { MadroneDescriptor, WatcherOptions } from '@/interfaces';

/**
 * Defines a single reactive or computed property on an object.
 *
 * If the descriptor has a `get` function, it creates a computed property that
 * automatically tracks dependencies and caches its result. Otherwise, it creates
 * a reactive property that triggers updates when changed.
 *
 * @param obj - The target object to define the property on
 * @param key - The property name to define
 * @param descriptor - Configuration for the property including getter/setter or value
 * @throws Error if no integration is configured (call `Madrone.use()` first)
 *
 * @example
 * ```ts
 * const state = { count: 0 };
 * define(state, 'doubled', {
 *   get() { return this.count * 2; },
 *   cache: true
 * });
 * ```
 */
export function define<T extends object>(obj: T, key: string, descriptor: MadroneDescriptor): void {
  const pl = getIntegration();

  if (!pl) {
    throw new Error('No integration specified');
  }

  if (typeof descriptor.get === 'function' && pl?.defineComputed) {
    pl.defineComputed(obj, key, {
      get: descriptor.get.bind(obj),
      set: descriptor.set?.bind(obj),
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable,
      cache: descriptor.cache ?? true,
    });
  } else if (!descriptor.get && pl?.defineProperty) {
    pl.defineProperty(obj, key, {
      value: descriptor.value,
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable,
      deep: descriptor.deep,
    });
  }
}

/**
 * Automatically makes all properties on an object reactive.
 *
 * Iterates through all own properties of the object and converts them:
 * - Properties with getters become cached computed properties
 * - Regular properties become deeply reactive by default
 *
 * This is the primary way to create reactive state in Madrone.
 *
 * @param obj - The object to make reactive
 * @param objDescriptors - Optional per-property configuration overrides
 * @returns The same object, now with reactive properties
 *
 * @example
 * ```ts
 * const state = auto({
 *   count: 0,
 *   get doubled() { return this.count * 2; }
 * });
 *
 * state.count = 5;
 * console.log(state.doubled); // 10
 * ```
 *
 * @example
 * ```ts
 * // With descriptor overrides
 * const state = auto(
 *   { items: [] },
 *   { items: { deep: false } } // Shallow reactivity for items
 * );
 * ```
 */
export function auto<T extends object>(
  obj: T,
  objDescriptors?: { [K in keyof T]?: MadroneDescriptor }
): T {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const getDesc = (name: string, descName: keyof MadroneDescriptor) => objDescriptors?.[name]?.[descName];

  for (const [key, descriptor] of Object.entries(descriptors)) {
    define(obj, key, {
      get: descriptor.get?.bind(obj),
      set: descriptor.set?.bind(obj),
      value: getDesc(key, 'value') ?? descriptor.value,
      enumerable: getDesc(key, 'enumerable') ?? descriptor.enumerable,
      configurable: getDesc(key, 'configurable') ?? descriptor.configurable,
      cache: getDesc(key, 'cache') ?? true,
      deep: getDesc(key, 'deep') ?? true,
    });
  }

  return obj as T;
}

/**
 * Watches a reactive expression and calls a handler when its value changes.
 *
 * The `scope` function is called immediately to establish dependencies.
 * Whenever any reactive property accessed within `scope` changes, the
 * function re-runs and `handler` is called with the new and old values.
 *
 * @param scope - A function that returns the value to watch. All reactive
 *                properties accessed within this function become dependencies.
 * @param handler - Callback invoked when the watched value changes
 * @param options - Optional configuration
 * @param options.immediate - If true, calls handler immediately with current value
 * @returns A disposer function that stops watching when called
 *
 * @example
 * ```ts
 * const state = auto({ count: 0 });
 *
 * const stop = watch(
 *   () => state.count,
 *   (newVal, oldVal) => console.log(`Changed from ${oldVal} to ${newVal}`)
 * );
 *
 * state.count = 5; // logs: "Changed from 0 to 5"
 * stop(); // Stop watching
 * ```
 *
 * @example
 * ```ts
 * // Watch with immediate execution
 * watch(
 *   () => state.count,
 *   (val) => console.log(`Count is ${val}`),
 *   { immediate: true }
 * );
 * // Immediately logs: "Count is 0"
 * ```
 */
export function watch<T>(
  scope: () => T,
  handler: (val: T, old: T) => void,
  options?: WatcherOptions
): (() => void) | undefined {
  const pl = getIntegration();

  return pl?.watch?.(scope, handler, options);
}
