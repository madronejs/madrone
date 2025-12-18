/**
 * @module MadroneState
 *
 * Standalone reactivity integration using Madrone's built-in reactive system.
 *
 * This is the default integration for Madrone, providing a complete reactivity
 * implementation based on JavaScript Proxies. It's the recommended integration
 * for non-Vue applications.
 *
 * @example
 * ```ts
 * import Madrone, { MadroneState, auto } from '@madronejs/core';
 *
 * // Initialize with the integration
 * Madrone.use(MadroneState);
 *
 * // Now use reactive features
 * const state = auto({ count: 0 });
 * ```
 */

import { objectAccessed } from '@/global';
import {
  Integration,
  IntegrationOptions,
  MadroneComputedDescriptor,
  MadronePropertyDescriptor,
} from '@/interfaces';
import {
  Computed, Reactive, Watcher, toRaw,
} from '@/reactivity';
import { ReactiveOptions } from '@/reactivity/interfaces';
import { ObservableHooksType } from '@/reactivity/Observer';

/**
 * Configuration options for MadroneState integration.
 *
 * Allows customizing the behavior of reactive properties and computed values.
 *
 * @typeParam T - The type of computed values (for typing onChange callbacks)
 */
export type MadroneStateOptions<T = unknown> = {
  /** Options passed to Reactive() for property creation */
  reactive?: ReactiveOptions,
  /** Hooks for computed property lifecycle events */
  computed?: ObservableHooksType<T>,
};

/**
 * Creates a property descriptor for a computed property.
 *
 * The descriptor can be used with Object.defineProperty or stored
 * for later use. If caching is enabled, creates a Computed observable
 * that tracks dependencies automatically.
 *
 * @typeParam T - The computed value type
 * @param name - Property name (used for debugging)
 * @param config - Computed property configuration
 * @param options - Optional hooks for lifecycle events
 * @returns A PropertyDescriptor with reactive getter/setter
 */
export function describeComputed<T = unknown>(
  name: string,
  config: MadroneComputedDescriptor,
  options?: MadroneStateOptions<T>
): PropertyDescriptor {
  let getter: () => T;
  let setter: (val: T) => void;

  if (config.cache) {
    const cp = Computed<T>({
      ...config,
      get: config.get as () => T,
      name,
      onImmediateChange: options?.computed?.onImmediateChange,
      onChange: options?.computed?.onChange,
      onGet: options?.computed?.onGet,
      onSet: options?.computed?.onSet,
    });

    getter = function get(this: object) {
      objectAccessed(this);

      return cp.value;
    };
    setter = function set(val: T) {
      cp.value = val;
    };
  } else {
    getter = function get(this: object) {
      objectAccessed(this);

      return config.get.call(this);
    };
    setter = function set(this: object, ...args: [T]) {
      config.set.call(this, ...args);
    };
  }

  return {
    enumerable: config.enumerable,
    configurable: config.configurable,
    get: getter,
    set: setter,
  };
}

/**
 * Creates a property descriptor for a reactive property.
 *
 * The descriptor can be used with Object.defineProperty or stored
 * for later use. Creates a Reactive proxy internally to track changes.
 *
 * @param name - Property name (used for debugging)
 * @param config - Reactive property configuration
 * @param options - Optional hooks for lifecycle events
 * @returns A PropertyDescriptor with reactive getter/setter
 */
export function describeProperty(
  name: string,
  config: MadronePropertyDescriptor,
  options?: MadroneStateOptions
): PropertyDescriptor {
  type Atom = { value: unknown };

  const tg: Atom = { value: config.value };
  const atom = Reactive<Atom>(tg, {
    name,
    onGet: options?.reactive?.onGet,
    onHas: options?.reactive?.onHas,
    onSet: options?.reactive?.onSet,
    onDelete: options?.reactive?.onDelete,
    needsProxy: options?.reactive?.needsProxy,
    deep: config.deep ?? options?.reactive?.deep,
  });

  return {
    configurable: config.configurable,
    enumerable: config.enumerable,
    get: function get(this: object) {
      objectAccessed(this);

      const { value: atomVal } = atom;

      if (Array.isArray(atomVal)) {
        // reactivity for arrays...
        Reflect.get(atomVal, 'length');
      }

      return atomVal;
    },
    set: function set(val: unknown) {
      atom.value = val;
    },
  };
}

/**
 * Defines a computed property directly on an object.
 *
 * Shorthand for calling describeComputed and Object.defineProperty.
 *
 * @param target - The object to define the property on
 * @param name - The property name
 * @param config - Computed configuration
 * @param options - Integration-specific options
 */
export function defineComputed(
  target: object,
  name: string,
  config: MadroneComputedDescriptor,
  options?: IntegrationOptions
): void {
  Object.defineProperty(target, name, describeComputed(name, config, options as MadroneStateOptions));
}

/**
 * Defines a reactive property directly on an object.
 *
 * Shorthand for calling describeProperty and Object.defineProperty.
 *
 * @param target - The object to define the property on
 * @param name - The property name
 * @param config - Reactive property configuration
 * @param options - Integration-specific options
 */
export function defineProperty(
  target: object,
  name: string,
  config: MadronePropertyDescriptor,
  options?: IntegrationOptions
): void {
  Object.defineProperty(target, name, describeProperty(name, config, options as MadroneStateOptions));
}

/**
 * The standalone MadroneState integration.
 *
 * Provides a complete reactivity system using JavaScript Proxies.
 * This is the recommended integration for non-Vue applications.
 *
 * @example
 * ```ts
 * import Madrone, { MadroneState } from '@madronejs/core';
 *
 * Madrone.use(MadroneState);
 * ```
 */
const MadroneState: Integration = {
  toRaw,
  watch: Watcher,
  describeProperty,
  defineProperty,
  describeComputed,
  defineComputed,
};

export default MadroneState;

/**
 * Creates a watcher that reacts to changes in reactive expressions.
 *
 * Re-exported from the reactivity module for convenience.
 */
export { Watcher as watch } from '@/reactivity';
