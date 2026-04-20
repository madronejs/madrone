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
  ensureMadroneMeta, ensureMadroneMetaOnBag, getMadroneMeta, installLazyReactive, installMixinComputed, isMixinInstalled,
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
 * Applies mixin classes to a base class by merging their prototypes and
 * replaying any `@reactive` / `@computed` metadata recorded on the mixins.
 *
 * Mutates `base`: copies own prototype descriptors (methods, getters, setters)
 * from each mixin onto `base.prototype`, then installs lazy-reactive accessors
 * on `base.prototype` for each mixed-in `@reactive` field. Properties declared
 * on `base` win over mixin entries with the same key.
 *
 * ### Timing
 *
 * Under TC39 standard decorators, `base[Symbol.metadata]` isn't attached
 * until after class decoration completes. This function needs to read base's
 * own entries from *somewhere*. Two valid patterns:
 *
 * - **Called after class decoration completes** (module top level, or inside
 *   a class decorator's `context.addInitializer` callback): reads
 *   `base[Symbol.metadata]` directly. No third argument needed.
 * - **Called synchronously inside a class decorator**: pass `context.metadata`
 *   as the third argument so base's own entries are found in the live
 *   metadata bag that TS will attach once decoration finishes. The bundled
 *   `@classMixin` uses the `addInitializer` variant, but this third-argument
 *   form is supported for consumers building their own class decorators that
 *   can't defer.
 *
 * @param base - The base class to extend (will be mutated)
 * @param mixins - Array of mixin classes whose prototypes will be merged in
 * @param baseMetadata - Optional: pass `context.metadata` when calling
 *   synchronously from inside a class decorator.
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
 * class Model {
 *   id: string;
 * }
 *
 * applyClassMixins(Model, [Timestamped]);
 * new Model().getAge();
 * ```
 *
 * @example
 * ```ts
 * // Inside a custom class decorator, pass context.metadata so base's own
 * // decorator entries aren't lost.
 * function withTimestamps<T extends Constructor>(
 *   target: T,
 *   context: ClassDecoratorContext<T>,
 * ) {
 *   applyClassMixins(target, [Timestamped], context.metadata);
 * }
 * ```
 */
export function applyClassMixins(
  base: Constructor,
  mixins: Constructor[],
  baseMetadata?: DecoratorMetadata,
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

  // Replay `@reactive` metadata from mixins — field decorators under TC39
  // produce no prototype artifacts of their own, so we install lazy-reactive
  // accessors on the target prototype for each mixed-in reactive key.
  // Entries are also accumulated into `base`'s metadata so that classes
  // which later mix in `base` see the full transitive chain.
  //
  // Keys the base class re-declares with its own decorator are skipped —
  // the base's own addInitializer handles reactivity, and clobbering its
  // descriptor with a mixin accessor would cause recursion on write. If
  // called synchronously inside a class decorator, `baseMetadata` points at
  // the live metadata bag (which TS later attaches to `base[Symbol.metadata]`).
  // Otherwise we read the already-attached bag via `ensureMadroneMeta`.
  const baseMeta = baseMetadata
    ? ensureMadroneMetaOnBag(baseMetadata)
    : ensureMadroneMeta(base);
  const baseOwnKeys = new Set(baseMeta.map((e) => e.key));

  // Collect mixin entries with later-wins semantics (matches the prototype
  // merge order `[...mixins, base]`). Base's own entries win over all mixin
  // entries — base is always last in the merge order.
  type MetaEntry = ReturnType<typeof getMadroneMeta> extends (infer U)[] | undefined ? U : never;

  const resolved = new Map<string | symbol, { entry: MetaEntry, originProto: object }>();

  for (const mixin of mixins) {
    for (const entry of getMadroneMeta(mixin) ?? []) {
      resolved.set(entry.key, { entry, originProto: mixin.prototype });
    }
  }

  for (const key of baseOwnKeys) resolved.delete(key);

  for (const { entry, originProto } of resolved.values()) {
    if (entry.kind === 'reactive') {
      installLazyReactive(base.prototype, entry.key, entry.options);
      baseMeta.push(entry);
    } else {
      // Resolve a paired setter: prefer one already carried on the metadata
      // entry (captured through an earlier mixin chain), else look at the
      // originating mixin's prototype for a non-mixin setter (a `set foo()`
      // that pairs with `@computed get foo()`).
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

type MixinFactory = (base: Constructor) => Constructor;

type UnionToIntersection<U> = (
  U extends unknown ? (arg: U) => void : never
) extends (arg: infer I) => void
  ? I
  : never;

/** Intersection of return types across a tuple of mixin factories. */
type ComposedResult<Ms extends readonly MixinFactory[]> = UnionToIntersection<
  { [K in keyof Ms]: ReturnType<Ms[K]> }[number]
>;

/**
 * Composes multiple functional mixins — higher-order class functions of the
 * form `<B extends Constructor>(base: B) => class extends base { ... }` — into
 * a single base class suitable for `extends`.
 *
 * Unlike `@classMixin`, which copies descriptors across a prototype boundary,
 * this is native JavaScript class inheritance: field initializers run, the
 * prototype chain is real, and types flow through `extends` without needing
 * `interface X extends Y {}` declaration merging. Prefer `compose` when
 * mixin `@reactive` fields need their initial values to carry over to
 * target instances.
 *
 * Reduces right-to-left, so the leftmost mixin is outermost (matches Redux-
 * style `compose`, and the mental model that `class X extends compose(A, B)`
 * reads "X is an A that is a B"). Accepts any number of mixin factories —
 * there's no hard arity cap, the typing is variadic.
 *
 * @see {@link classMixin} for the decorator-based alternative that doesn't
 *   add prototype-chain layers but requires `interface X extends Y {}` type
 *   merging and loses mixin field initializers.
 *
 * @example
 * ```ts
 * const Timestamped = <T extends Constructor>(Base: T) => class extends Base {
 *   @reactive createdAt = Date.now();
 * };
 *
 * const Named = <T extends Constructor>(Base: T) => class extends Base {
 *   @reactive fName = '';
 *   @reactive lName = '';
 *
 *   @computed get fullName() {
 *     return `${this.fName} ${this.lName}`;
 *   }
 * };
 *
 * class Person extends compose(Timestamped, Named) {
 *   @reactive age = 0;
 * }
 * ```
 */
export function compose<Ms extends readonly MixinFactory[]>(
  ...mixins: [...Ms]
): ComposedResult<Ms> {
  let Base: Constructor = class {};

  for (let i = mixins.length - 1; i >= 0; i -= 1) {
    Base = mixins[i](Base);
  }

  return Base as ComposedResult<Ms>;
}
