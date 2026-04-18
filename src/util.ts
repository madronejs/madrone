/**
 * @module util
 *
 * Utility functions for object composition and class mixins.
 *
 * These utilities support Madrone's composition-based architecture,
 * allowing you to build complex objects from simpler pieces.
 */

import type { Constructor } from '@/interfaces';
import {
  ensureMadroneMeta, ensureMadroneMetaOnBag, getMadroneMeta, installMixinComputed, installMixinReactive, isMixinInstalled,
} from '@/mixinSupport';

type AnyObject = Record<string, unknown>;

type OptionalPropertyNames<T> = {
  [K in keyof T]-?: object extends { [P in K]: T[K] } ? K : never;
}[keyof T];

type SpreadProperties<L, R, K extends keyof L & keyof R> = {
  [P in K]: L[P] | Exclude<R[P], undefined>;
};

type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

/**
 * Type utility that merges two object types, with right-hand properties
 * taking precedence over left-hand properties.
 *
 * @typeParam L - The left (base) type
 * @typeParam R - The right (override) type
 */
export type SpreadTwo<L, R> = Id<
  Pick<L, Exclude<keyof L, keyof R>>
  & Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>>
  & Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>>
  & SpreadProperties<L, R, OptionalPropertyNames<R> & keyof L>
>;

type ObjectOrFactory = object | ((...args: unknown[]) => object);

/**
 * Type utility that recursively merges an array of object types.
 *
 * Handles both plain objects and factory functions (whose return
 * types are extracted and merged).
 *
 * @typeParam A - A tuple of object or factory types
 */
export type Spread<A extends readonly unknown[]> = A extends [infer L, ...infer R]
  ? SpreadTwo<L extends (...args: unknown[]) => infer RT ? RT : L, Spread<R>>
  : unknown;

/**
 * Merges multiple objects or factory functions into a single new object.
 *
 * Properties from later arguments override those from earlier ones.
 * Factory functions are called and their return values are merged.
 * All property descriptors (getters, setters, etc.) are preserved.
 *
 * @typeParam A - The types of objects/factories being merged
 * @param types - Objects or factory functions to merge
 * @returns A new object with all properties from all inputs
 *
 * @example
 * ```ts
 * import { merge } from '@madronejs/core';
 *
 * const base = { name: 'base', value: 1 };
 * const override = { value: 2, extra: true };
 *
 * const merged = merge(base, override);
 * // { name: 'base', value: 2, extra: true }
 * ```
 *
 * @example
 * ```ts
 * // With factory functions
 * const createTimestamp = () => ({ createdAt: Date.now() });
 * const data = { name: 'item' };
 *
 * const result = merge(createTimestamp, data);
 * // { createdAt: 1702345678901, name: 'item' }
 * ```
 */
export function merge<A extends ObjectOrFactory[]>(...types: [...A]): Spread<A> {
  const defs = {} as PropertyDescriptorMap;
  const newVal = {};

  for (const type of types) {
    const theType = typeof type === 'function' ? (type as () => object)() : type;

    Object.assign(defs, Object.getOwnPropertyDescriptors(theType ?? type ?? {}));
  }

  Object.defineProperties(newVal, defs);

  return newVal as Spread<A>;
}

/**
 * Applies mixin classes to a base class by merging their prototypes.
 *
 * This function mutates the base class, copying all prototype properties
 * from the mixin classes onto the base class prototype. Properties from
 * the base class take precedence over mixin properties in case of conflicts.
 *
 * @param base - The base class to extend (will be mutated)
 * @param mixins - Array of mixin classes whose prototypes will be merged in
 *
 * @example
 * ```ts
 * import { applyClassMixins } from '@madronejs/core';
 *
 * class Timestamped {
 *   createdAt = Date.now();
 *   getAge() {
 *     return Date.now() - this.createdAt;
 *   }
 * }
 *
 * class Serializable {
 *   toJSON() {
 *     return JSON.stringify(this);
 *   }
 * }
 *
 * class Model {
 *   id: string;
 * }
 *
 * // Add Timestamped and Serializable methods to Model
 * applyClassMixins(Model, [Timestamped, Serializable]);
 *
 * const model = new Model();
 * model.toJSON(); // Works!
 * model.getAge(); // Works!
 * ```
 */
export function applyClassMixins(
  base: Constructor,
  mixins: Constructor[],
  baseMetadata?: DecoratorMetadata
): void {
  // Build the merged descriptor map for the prototype merge, but strip any
  // lazy-mixin accessors that came from a mixin's prototype. They belong to
  // that mixin's own installation — re-copying them onto `base.prototype`
  // would propagate accessors between unrelated classes and cause writes
  // to flow through the wrong setup (e.g. a computed setter captured from
  // an intermediate class, causing "No setter defined" errors on write).
  const mergedDescriptors = Object.getOwnPropertyDescriptors(
    merge(...[...mixins, base].map((item) => item.prototype))
  );

  for (const key of Object.keys(mergedDescriptors)) {
    if (isMixinInstalled(mergedDescriptors[key])) {
      delete mergedDescriptors[key];
    }
  }

  Object.defineProperties(base.prototype, mergedDescriptors);

  // Replay decorator metadata from mixins. Field decorators under TC39
  // standard decorators produce no prototype artifacts of their own, so
  // we install lazy accessors on the target prototype for mixed-in
  // @reactive fields, and wrap mixed-in @computed getters. The installed
  // entries are *also* accumulated into `base`'s metadata so that classes
  // which later mix in `base` see the full transitive chain.
  //
  // When called from an active class decorator, `baseMetadata` is the live
  // metadata reference shared with all other decorators on the class —
  // `base[Symbol.metadata]` is only attached after decoration completes, so
  // reading it via the class constructor during decoration sees nothing.
  //
  // Keys the base class re-declares with its own decorator are skipped —
  // the base's own addInitializer handles reactivity, and clobbering its
  // descriptor with a mixin wrapper would lose the base's paired setter
  // and cause recursion on write.
  const baseMeta = baseMetadata
    ? ensureMadroneMetaOnBag(baseMetadata)
    : ensureMadroneMeta(base);
  const baseOwnKeys = new Set(baseMeta.map((e) => e.key));

  // Collect mixin entries with later-wins semantics (matches the prototype
  // merge order `[...mixins, base]`). A later mixin's entry overrides an
  // earlier mixin's entry for the same key. Base's own entries then win
  // over all mixin entries — `base` is always last in the merge order.
  const resolved = new Map<string | symbol, { entry: Meta, originProto: object }>();

  type Meta = ReturnType<typeof getMadroneMeta> extends (infer U)[] | undefined ? U : never;

  for (const mixin of mixins) {
    const entries = getMadroneMeta(mixin) ?? [];

    for (const entry of entries) {
      resolved.set(entry.key, { entry, originProto: mixin.prototype });
    }
  }

  for (const key of baseOwnKeys) resolved.delete(key);

  for (const { entry, originProto } of resolved.values()) {
    if (entry.kind === 'reactive') {
      installMixinReactive(base.prototype, entry.key, entry.options);
      baseMeta.push(entry);
    } else {
      // Resolve a paired setter: prefer one already carried on the metadata
      // entry (captured through an earlier mixin chain), else look at the
      // originating mixin's prototype for a non-mixin setter (e.g. a
      // `set $relLinks(val)` that pairs with `@computed get $relLinks()`).
      const originalDesc = Object.getOwnPropertyDescriptor(originProto, entry.key);
      const resolvedSetter = entry.setter
        ?? (originalDesc && !isMixinInstalled(originalDesc)
          ? (originalDesc.set as ((this: object, val: unknown) => void) | undefined)
          : undefined);

      installMixinComputed(base.prototype, entry.key, entry.getter, entry.options, resolvedSetter);
      baseMeta.push({ ...entry, setter: resolvedSetter });
    }
  }
}

/**
 * Creates a property descriptor map with default descriptor settings.
 *
 * Takes an object and returns its property descriptors with specified
 * defaults applied. Useful for copying properties with consistent settings.
 *
 * @param obj - The source object
 * @param defaults - Default descriptor values to apply
 * @returns Property descriptor map with defaults applied
 *
 * @internal
 */
export function getDefaultDescriptors(
  obj: object,
  defaults?: Partial<PropertyDescriptor>
): PropertyDescriptorMap {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const newDefaults = { configurable: true, enumerable: false, ...defaults };

  for (const key of Object.keys(descriptors)) {
    for (const [descKey, descValue] of Object.entries(newDefaults)) {
      (descriptors[key] as AnyObject)[descKey] = descValue;
    }
  }

  return descriptors;
}
