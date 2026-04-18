/**
 * @module decorate
 *
 * TC39 Stage 3 decorators for class-based reactive state management.
 *
 * Provides `@reactive` and `@computed` decorators that enable automatic
 * reactivity on class fields and getters. Reactivity is installed per-instance
 * via `addInitializer`, and decorator metadata is recorded on the class so
 * that `applyClassMixins` can replicate mixed-in reactivity on the target.
 *
 * Requires TypeScript 5.0+ with standard decorators and
 * `useDefineForClassFields: true` (default under `target: ES2022`+).
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
import {
  computedDescriptor,
  findAccessor,
  markInitialized,
  reactiveDescriptor,
  recordMeta,
} from '@/mixinSupport';
import { DecoratorOptionType, DecoratorDescriptorType, Constructor } from './interfaces';

// ////////////////////////////
// CLASS MIXIN
// ////////////////////////////

/**
 * Class decorator that mixes in methods from other classes.
 *
 * Copies prototype properties from the mixin classes onto the decorated
 * class and replays their `@reactive` / `@computed` decorator metadata so
 * that mixed-in reactivity works on instances of the target class.
 *
 * @example
 * ```ts
 * class Timestamped {
 *   createdAt = Date.now();
 * }
 *
 * @classMixin(Timestamped)
 * class Model {
 *   name: string;
 * }
 * ```
 */
export function classMixin(...mixins: Constructor[]) {
  return function classMixinDecorator<T extends Constructor>(target: T): void {
    if (mixins?.length) {
      applyClassMixins(target, mixins);
    }
  };
}

// ////////////////////////////
// REACTIVE
// ////////////////////////////

export type ReactiveFieldDecorator = <This, Value>(
  value: undefined,
  context: ClassFieldDecoratorContext<This, Value>
) => void;

export interface ReactiveDecorator extends ReactiveFieldDecorator {
  /**
   * Decorator variant that creates a shallow reactive property.
   *
   * Only the property itself is reactive — nested objects and arrays are not
   * wrapped. Use this for large collections where deep tracking is unnecessary.
   *
   * @example
   * ```ts
   * class Cache {
   *   @reactive.shallow data = { nested: { value: 1 } };
   * }
   * ```
   */
  shallow: ReactiveFieldDecorator,

  /**
   * Creates a configured reactive decorator with custom descriptor options.
   *
   * @param descriptorOverrides - Options to customize the reactive behavior
   *
   * @example
   * ```ts
   * class Example {
   *   @reactive.configure({ deep: false, enumerable: false })
   *   hiddenData = { secret: true };
   * }
   * ```
   */
  configure: (descriptorOverrides: DecoratorDescriptorType) => ReactiveFieldDecorator,
}

function createReactiveDecorator(options?: DecoratorOptionType): ReactiveFieldDecorator {
  return function reactiveDecorator(_value, context): void {
    const key = context.name;

    recordMeta(context.metadata, { kind: 'reactive', key, options });

    context.addInitializer(function addReactiveInitializer() {
      const instance = this as object;

      if (!markInitialized(instance, key)) return;

      if (!getIntegration()) return;

      // Under useDefineForClassFields, field initialization has already
      // assigned the value as a plain data property. Capture it, then
      // redefine the property as a reactive accessor.
      const initialValue = (instance as Record<string | symbol, unknown>)[key as string];

      define(instance, key as string, reactiveDescriptor(initialValue, options));
    });
  };
}

/**
 * Decorator that makes a class field reactive.
 *
 * When the field changes, computed properties and watchers that depend on it
 * will automatically update. Reactivity is deep by default — nested objects
 * and arrays are also wrapped.
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
 * ```
 */
export const reactive: ReactiveDecorator = Object.assign(
  createReactiveDecorator(),
  {
    shallow: createReactiveDecorator({ descriptors: { deep: false } }),
    configure: (descriptorOverrides: DecoratorDescriptorType) => createReactiveDecorator({ descriptors: descriptorOverrides }),
  }
);

// ////////////////////////////
// COMPUTED
// ////////////////////////////

export type ComputedGetterDecorator = <This, Value>(
  getter: (this: This) => Value,
  context: ClassGetterDecoratorContext<This, Value>
) => void;

export interface ComputedDecorator extends ComputedGetterDecorator {
  /**
   * Creates a configured computed decorator with custom descriptor options.
   *
   * @example
   * ```ts
   * class Example {
   *   @computed.configure({ cache: false })
   *   get uncached() {
   *     return Date.now();
   *   }
   * }
   * ```
   */
  configure: (descriptorOverrides: DecoratorDescriptorType) => ComputedGetterDecorator,
}

function createComputedDecorator(options?: DecoratorOptionType): ComputedGetterDecorator {
  return function computedDecorator(getter, context): void {
    const key = context.name;
    const typedGetter = getter as unknown as (this: object) => unknown;

    recordMeta(context.metadata, {
      kind: 'computed', key, options, getter: typedGetter,
    });

    context.addInitializer(function addComputedInitializer() {
      const instance = this as object;

      if (!markInitialized(instance, key)) return;

      if (!getIntegration()) return;

      // TC39 getter decorators only receive the getter; if the class paired
      // it with an un-decorated setter, pull the setter off the descriptor
      // so writes flow through the reactive Computed wrapper.
      const existing = findAccessor(instance, key);
      const setter = existing?.set as ((val: unknown) => void) | undefined;

      define(instance, key as string, computedDescriptor(typedGetter, setter, options));
    });
  };
}

/**
 * Decorator that creates a cached computed property from a getter.
 *
 * Cached values are only recalculated when their reactive dependencies change.
 *
 * @example
 * ```ts
 * class ShoppingCart {
 *   @reactive items: Array<{ price: number }> = [];
 *
 *   @computed get total() {
 *     return this.items.reduce((sum, item) => sum + item.price, 0);
 *   }
 * }
 * ```
 */
export const computed: ComputedDecorator = Object.assign(
  createComputedDecorator(),
  {
    configure: (descriptorOverrides: DecoratorDescriptorType) => createComputedDecorator({ descriptors: descriptorOverrides }),
  }
);
