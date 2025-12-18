/**
 * @module decorate
 *
 * TypeScript decorators for class-based reactive state management.
 *
 * Provides `@reactive` and `@computed` decorators that enable automatic
 * reactivity on class properties and getters. These decorators lazily
 * initialize reactive properties on first access, making them efficient
 * for large class hierarchies.
 *
 * @example
 * ```ts
 * import { reactive, computed } from '@madronejs/core';
 *
 * class Counter {
 *   @reactive count = 0;
 *
 *   @computed get doubled() {
 *     return this.count * 2;
 *   }
 * }
 * ```
 */

import { getIntegration } from '@/global';
import { applyClassMixins } from '@/util';
import { define } from '@/auto';
import { DecoratorOptionType, DecoratorDescriptorType, Constructor } from './interfaces';

const itemMap = new WeakMap<object, Set<string>>();

/**
 * Class decorator that mixes in methods from other classes.
 *
 * Copies all prototype properties from the mixin classes onto the
 * decorated class. Useful for composing behavior from multiple sources.
 *
 * @param mixins - Classes whose prototypes will be mixed in
 * @returns A class decorator function
 *
 * @example
 * ```ts
 * class Timestamped {
 *   createdAt = Date.now();
 * }
 *
 * class Serializable {
 *   toJSON() { return JSON.stringify(this); }
 * }
 *
 * @classMixin(Timestamped, Serializable)
 * class Model {
 *   name: string;
 * }
 *
 * const model = new Model();
 * model.toJSON(); // Works - mixed in from Serializable
 * ```
 */
export function classMixin(...mixins: Constructor[]) {
  return (target: Constructor) => {
    if (mixins?.length) {
      applyClassMixins(target, mixins);
    }
  };
}

function trackTargetIfNeeded(target: object): void {
  if (!itemMap.has(target)) {
    itemMap.set(target, new Set());
  }
}

function checkTargetObserved(target: object, key: string): boolean {
  trackTargetIfNeeded(target);

  return itemMap.get(target).has(key);
}

function setTargetObserved(target: object, key: string): void {
  trackTargetIfNeeded(target);
  itemMap.get(target).add(key);
}

// ////////////////////////////
// COMPUTED
// ////////////////////////////

function computedIfNeeded(
  target: object,
  key: string,
  descriptor: PropertyDescriptor,
  options?: DecoratorOptionType
): boolean {
  const pl = getIntegration();

  if (pl && !checkTargetObserved(target, key)) {
    define(target, key, {
      ...descriptor,
      get: descriptor.get.bind(target),
      set: descriptor.set?.bind(target),
      enumerable: true,
      ...options?.descriptors,
      cache: true,
    });
    setTargetObserved(target, key);

    return true;
  }

  return false;
}

function decorateComputed(
  target: object,
  key: string,
  descriptor: PropertyDescriptor,
  options?: DecoratorOptionType
): PropertyDescriptor {
  if (typeof descriptor.get === 'function') {
    const newDescriptor: PropertyDescriptor = {
      ...descriptor,
      enumerable: true,
      configurable: true,
    };

    newDescriptor.get = function computedGetter(this: Record<string, unknown>) {
      computedIfNeeded(this, key, descriptor, options);

      return this[key];
    };

    newDescriptor.set = function computedSetter(this: Record<string, unknown>, val: unknown) {
      computedIfNeeded(this, key, descriptor, options);
      this[key] = val;
    };

    return newDescriptor;
  }

  return descriptor;
}

/**
 * Decorator that creates a cached computed property from a getter.
 *
 * When applied to a getter, the computed value is cached and only recalculated
 * when its reactive dependencies change. This provides efficient derived state
 * that automatically stays in sync with source data.
 *
 * The decorator lazily initializes the computed property on first access,
 * so it works correctly with class inheritance and instance creation.
 *
 * @param target - The class prototype
 * @param key - The property name
 * @param descriptor - The property descriptor containing the getter
 * @returns Modified property descriptor with caching behavior
 *
 * @example
 * ```ts
 * import { reactive, computed } from '@madronejs/core';
 *
 * class ShoppingCart {
 *   @reactive items: Array<{ price: number }> = [];
 *
 *   @computed get total() {
 *     return this.items.reduce((sum, item) => sum + item.price, 0);
 *   }
 *
 *   @computed get isEmpty() {
 *     return this.items.length === 0;
 *   }
 * }
 *
 * const cart = new ShoppingCart();
 * cart.items.push({ price: 10 });
 * console.log(cart.total); // 10 (computed once)
 * console.log(cart.total); // 10 (cached, no recalculation)
 * ```
 */
export function computed(target: object, key: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  return decorateComputed(target, key, descriptor);
}

/**
 * Creates a configured computed decorator with custom options.
 *
 * @param descriptorOverrides - Options to customize the computed behavior
 * @returns A computed decorator with the specified configuration
 *
 * @example
 * ```ts
 * class Example {
 *   @computed.configure({ cache: false })
 *   get uncached() {
 *     return Date.now(); // Recalculates every access
 *   }
 * }
 * ```
 */
computed.configure = function configureComputed(descriptorOverrides: DecoratorDescriptorType) {
  return (target: object, key: string, descriptor: PropertyDescriptor) => decorateComputed(
    target,
    key,
    descriptor,
    { descriptors: descriptorOverrides }
  );
};

// ////////////////////////////
// REACTIVE
// ////////////////////////////

function reactiveIfNeeded(target: object, key: string, options?: DecoratorOptionType): boolean {
  const pl = getIntegration();

  if (pl && !checkTargetObserved(target, key)) {
    setTargetObserved(target, key);
    define(target, key, {
      ...Object.getOwnPropertyDescriptor(target, key),
      enumerable: true,
      ...options?.descriptors,
    });

    return true;
  }

  return false;
}

function decorateReactive(target: object, key: string, options?: DecoratorOptionType): void {
  if (typeof target === 'function') {
    // handle the static case
    reactiveIfNeeded(target, key);
  } else {
    // handle the prototype case
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: true,
      get(this: Record<string, unknown>) {
        if (reactiveIfNeeded(this, key, options)) {
          return this[key];
        }

        return undefined;
      },
      set(this: Record<string, unknown>, val: unknown) {
        if (reactiveIfNeeded(this, key, options)) {
          this[key] = val;
        }
      },
    });
  }
}

/**
 * Decorator that makes a class property reactive.
 *
 * When the property value changes, any computed properties or watchers
 * that depend on it will automatically update. By default, reactivity
 * is deep - nested objects and arrays will also be reactive.
 *
 * The decorator lazily initializes reactivity on first access, making
 * it efficient for classes with many properties that may not all be used.
 *
 * @param target - The class prototype (or constructor for static properties)
 * @param key - The property name
 *
 * @example
 * ```ts
 * import { reactive, computed, watch } from '@madronejs/core';
 *
 * class User {
 *   @reactive name = 'Anonymous';
 *   @reactive preferences = { theme: 'dark' };
 *
 *   @computed get greeting() {
 *     return `Hello, ${this.name}!`;
 *   }
 * }
 *
 * const user = new User();
 *
 * watch(
 *   () => user.name,
 *   (name) => console.log(`Name changed to ${name}`)
 * );
 *
 * user.name = 'Alice'; // Triggers watcher, updates greeting
 * user.preferences.theme = 'light'; // Deep reactivity works
 * ```
 */
export function reactive(target: object, key: string): void {
  return decorateReactive(target, key);
}

/**
 * Decorator variant that creates a shallow reactive property.
 *
 * Only the property itself is reactive, not nested objects or arrays.
 * Use this when you don't need deep reactivity and want better performance,
 * or when dealing with large objects where deep tracking is unnecessary.
 *
 * @param target - The class prototype
 * @param key - The property name
 *
 * @example
 * ```ts
 * class Cache {
 *   // Only triggers when `data` is reassigned, not when nested values change
 *   @reactive.shallow data = { nested: { value: 1 } };
 * }
 *
 * const cache = new Cache();
 * cache.data.nested.value = 2; // Does NOT trigger reactivity
 * cache.data = { nested: { value: 3 } }; // DOES trigger reactivity
 * ```
 */
reactive.shallow = function configureReactive(target: object, key: string): void {
  return decorateReactive(target, key, { descriptors: { deep: false } });
};

/**
 * Creates a configured reactive decorator with custom options.
 *
 * @param descriptorOverrides - Options to customize the reactive behavior
 * @returns A reactive decorator with the specified configuration
 *
 * @example
 * ```ts
 * class Example {
 *   @reactive.configure({ deep: false, enumerable: false })
 *   hiddenData = { secret: true };
 * }
 * ```
 */
reactive.configure = function configureReactive(descriptorOverrides: DecoratorDescriptorType) {
  return (target: object, key: string) => decorateReactive(target, key, { descriptors: descriptorOverrides });
};
