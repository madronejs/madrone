/**
 * @module mixinSupport
 *
 * Shared internals for the TC39 decorator system: metadata storage,
 * lazy-initialization tracking, and helpers used by both the `@reactive` /
 * `@computed` decorators and `applyClassMixins`.
 *
 * This module exists to keep `decorate.ts` and `util.ts` decoupled — without
 * it, `decorate.ts` would depend on `applyClassMixins` while `util.ts` would
 * depend on the decorator metadata, creating a circular import.
 */

import { getIntegration } from '@/global';
import { define } from '@/auto';
import { DecoratorOptionType } from './interfaces';

// `Symbol.metadata` carries TC39 decorator metadata from `context.metadata`
// to `Class[Symbol.metadata]`, but most runtimes don't expose it natively.
(Symbol as unknown as { metadata: symbol }).metadata ??= Symbol.for('Symbol.metadata');

export const MADRONE_META = Symbol.for('@madronejs/decorators');

export type ReactiveMeta = {
  kind: 'reactive',
  key: string | symbol,
  options?: DecoratorOptionType,
};

export type ComputedMeta = {
  kind: 'computed',
  key: string | symbol,
  options?: DecoratorOptionType,
  getter: (this: object) => unknown,
  /**
   * The paired non-decorated setter from the original class's prototype, if
   * any. Captured and carried through the mixin chain so that downstream
   * classes can wire up the reactive Computed with a working setter.
   * `@computed` itself only receives the getter under TC39 decorators.
   */
  setter?: (this: object, val: unknown) => void,
};

export type MadroneMeta = ReactiveMeta | ComputedMeta;

const initializedMap = new WeakMap<object, Set<string | symbol>>();

/**
 * Marks a given `key` as initialized on `target`. Returns `true` if this call
 * performed the marking (i.e. the key was not already marked), and `false`
 * if the key had already been initialized. Used by decorators and mixin
 * helpers to avoid redefining a reactive property twice.
 */
export function markInitialized(target: object, key: string | symbol): boolean {
  let set = initializedMap.get(target);

  if (!set) {
    set = new Set();
    initializedMap.set(target, set);
  }

  if (set.has(key)) return false;

  set.add(key);

  return true;
}

/** Returns whether `key` has already been initialized on `target`. */
export function isInitialized(target: object, key: string | symbol): boolean {
  return initializedMap.get(target)?.has(key) ?? false;
}

/** Records a decorator registration onto the class's metadata bag. */
export function recordMeta(metadata: DecoratorMetadata, entry: MadroneMeta): void {
  const bag = metadata as unknown as Record<symbol, MadroneMeta[]>;

  if (!bag[MADRONE_META]) bag[MADRONE_META] = [];

  bag[MADRONE_META].push(entry);
}

/**
 * Reads the decorator metadata stored on a class by `@reactive` / `@computed`.
 * Returns `undefined` if the class has no madrone decorator metadata.
 */
export function getMadroneMeta(target: object): MadroneMeta[] | undefined {
  const sym = (Symbol as unknown as { metadata: symbol }).metadata;
  const meta = (target as Record<symbol, unknown>)[sym] as Record<symbol, MadroneMeta[]> | undefined;

  return meta?.[MADRONE_META];
}

/**
 * Returns the madrone decorator metadata array for `target`, creating (and
 * attaching) an empty one if it doesn't exist yet. Used by `applyClassMixins`
 * when `target[Symbol.metadata]` is already attached (i.e. after class
 * decoration completes, or when called imperatively on a non-decorated class).
 *
 * During active class decoration, callers should use `ensureMadroneMetaOnBag`
 * with the live `context.metadata` reference instead — otherwise mutations
 * here will be overwritten when TS later assigns `context.metadata` to
 * `Class[Symbol.metadata]`.
 */
export function ensureMadroneMeta(target: object): MadroneMeta[] {
  const sym = (Symbol as unknown as { metadata: symbol }).metadata;
  const holder = target as Record<symbol, Record<symbol, MadroneMeta[]> | undefined>;

  if (!holder[sym]) holder[sym] = {} as Record<symbol, MadroneMeta[]>;

  const bag = holder[sym];

  if (!bag[MADRONE_META]) bag[MADRONE_META] = [];

  return bag[MADRONE_META];
}

/**
 * Like `ensureMadroneMeta` but takes a `DecoratorMetadata` bag directly — used
 * by `applyClassMixins` during active class decoration, when the bag hasn't
 * yet been attached to the class constructor.
 */
export function ensureMadroneMetaOnBag(metadata: DecoratorMetadata): MadroneMeta[] {
  const bag = metadata as unknown as Record<symbol, MadroneMeta[]>;

  if (!bag[MADRONE_META]) bag[MADRONE_META] = [];

  return bag[MADRONE_META];
}

/** Walks the prototype chain to find the first descriptor that defines `key`. */
export function findAccessor(obj: object, key: string | symbol): PropertyDescriptor | undefined {
  let current: object | null = obj;

  while (current && current !== Object.prototype && current !== Function.prototype) {
    const desc = Object.getOwnPropertyDescriptor(current, key);

    if (desc) return desc;

    current = Object.getPrototypeOf(current);
  }

  return undefined;
}

export function reactiveDescriptor(value: unknown, options?: DecoratorOptionType) {
  return {
    value,
    enumerable: true,
    configurable: false,
    deep: true,
    ...options?.descriptors,
  };
}

export function computedDescriptor(
  getter: (this: object) => unknown,
  setter: ((this: object, val: unknown) => void) | undefined,
  options?: DecoratorOptionType
) {
  return {
    get: getter,
    // Default to non-enumerable (matches native JS semantics for class
    // getters — `class X { get foo() {} }` puts `foo` on the prototype as
    // non-enumerable) and avoids `{ ...instance }` accidentally triggering
    // every computed on the instance. Callers can override via
    // `@computed.configure({ enumerable: true })`.
    enumerable: false,
    set: setter,
    configurable: true,
    cache: true,
    ...options?.descriptors,
  };
}

type MixinMarkedFn = { __madroneMixin?: true } & ((...args: unknown[]) => unknown);

// ////////////////////////////
// DEFERRED (LAZY) SETUP SUPPORT
// ////////////////////////////
//
// When a decorated class is instantiated before an integration has been
// registered (e.g. `new Foo()` runs in a module that loads before
// `Madrone.use(...)`), we can't build the reactive atom / cached computed
// yet. Instead of bailing silently — which would leave the instance with
// no retry path — we install a prototype-level lazy accessor that
// reattempts the install on first read/write once an integration becomes
// available.

const protoLazyInstalled = new WeakMap<object, Set<string | symbol>>();

/**
 * Returns true (and records) if we should install a lazy accessor for
 * `(proto, key)`. Returns false if one has already been installed. Per-
 * prototype tracking keeps the accessor from being reinstalled for every
 * instance constructed before an integration is available.
 */
function claimProtoLazySlot(proto: object, key: string | symbol): boolean {
  let keys = protoLazyInstalled.get(proto);

  if (!keys) {
    keys = new Set();
    protoLazyInstalled.set(proto, keys);
  }

  if (keys.has(key)) return false;

  keys.add(key);

  return true;
}

const PENDING_VALUES = Symbol.for('@madronejs/pendingValues');

type PendingMap = Map<string | symbol, unknown>;

function pendingMap(instance: object): PendingMap {
  let map = (instance as Record<symbol, PendingMap | undefined>)[PENDING_VALUES];

  if (!map) {
    map = new Map();
    Object.defineProperty(instance, PENDING_VALUES, {
      value: map, writable: false, enumerable: false, configurable: true,
    });
  }

  return map;
}

function stashPending(instance: object, key: string | symbol, value: unknown): void {
  pendingMap(instance).set(key, value);
}

function takePending(instance: object, key: string | symbol): unknown {
  const map = (instance as Record<symbol, PendingMap | undefined>)[PENDING_VALUES];

  if (!map) return undefined;

  const val = map.get(key);

  map.delete(key);

  return val;
}

function peekPending(instance: object, key: string | symbol): unknown {
  return (instance as Record<symbol, PendingMap | undefined>)[PENDING_VALUES]?.get(key);
}

/**
 * Installs a lazy reactive accessor on `proto[key]` — used by `@reactive`'s
 * `addInitializer` when no integration is available at construction time.
 *
 * Call flow from the field decorator:
 * 1. Field init creates `instance.foo = value` as a plain data property.
 * 2. `addInitializer` runs, sees no integration, stashes the value in the
 *    instance's `PENDING_VALUES` map, deletes the own property, and calls
 *    this function (guarded by `claimProtoLazySlot`) to install the accessor.
 * 3. Later, after `Madrone.use(...)`, the first read/write on an instance
 *    finds no own property and reaches the prototype accessor. It then
 *    calls `define()` to replace itself with a real reactive accessor on
 *    the instance, using the stashed initial value.
 */
export function installDeferredReactive(
  proto: object,
  key: string | symbol,
  options?: DecoratorOptionType
): void {
  if (!claimProtoLazySlot(proto, key)) return;

  Object.defineProperty(proto, key, {
    configurable: true,
    enumerable: true,
    get(this: object) {
      if (!getIntegration()) return peekPending(this, key);

      const value = takePending(this, key);

      define(this, key as string, reactiveDescriptor(value, options));

      return (this as Record<string | symbol, unknown>)[key as string];
    },
    set(this: object, val: unknown) {
      if (!getIntegration()) {
        stashPending(this, key, val);

        return;
      }

      takePending(this, key);
      define(this, key as string, reactiveDescriptor(val, options));
    },
  });
}

/**
 * Called from `@reactive`'s `addInitializer` when no integration is
 * available — stashes the initial value, drops the own data property so
 * the prototype's deferred accessor takes over, and installs that accessor
 * (once per prototype).
 */
export function deferReactiveInstall(
  instance: object,
  key: string | symbol,
  initialValue: unknown,
  options?: DecoratorOptionType
): void {
  stashPending(instance, key, initialValue);
  delete (instance as Record<string | symbol, unknown>)[key as string];
  installDeferredReactive(Object.getPrototypeOf(instance), key, options);
}

/**
 * Returns true if the property descriptor was installed by `installMixinReactive`
 * or `installMixinComputed` — its get/set functions are tagged with a marker
 * symbol. We can't store the marker on the descriptor itself because
 * `Object.defineProperty` ignores non-standard descriptor keys and they're
 * lost the moment the property is defined.
 */
export function isMixinInstalled(descriptor: PropertyDescriptor | undefined): boolean {
  if (!descriptor) return false;

  return Boolean(
    (descriptor.get as MixinMarkedFn | undefined)?.__madroneMixin
    || (descriptor.set as MixinMarkedFn | undefined)?.__madroneMixin
  );
}

/**
 * Installs a lazy-reactive accessor on `proto` for `key`. On first read or
 * write, the accessor sets up real reactivity on the instance, mirroring
 * what `@reactive` would do if the decorator were applied directly to the
 * target class.
 */
export function installMixinReactive(
  proto: object,
  key: string | symbol,
  options?: DecoratorOptionType
): void {
  const existing = Object.getOwnPropertyDescriptor(proto, key);

  // If the target already declared its own descriptor (e.g. a re-applied
  // `@reactive` on the target class itself), defer to that one.
  if (existing && !isMixinInstalled(existing)) return;

  const lazyGet = function lazyReactiveGet(this: object) {
    if (!getIntegration()) return undefined;

    if (markInitialized(this, key)) {
      define(this, key as string, reactiveDescriptor(undefined, options));
    }

    return (this as Record<string | symbol, unknown>)[key as string];
  } as MixinMarkedFn;

  const lazySet = function lazyReactiveSet(this: object, val: unknown) {
    if (!getIntegration()) return;

    if (markInitialized(this, key)) {
      define(this, key as string, reactiveDescriptor(val, options));
    } else {
      (this as Record<string | symbol, unknown>)[key as string] = val;
    }
  } as MixinMarkedFn;

  lazyGet.__madroneMixin = true;
  lazySet.__madroneMixin = true;

  Object.defineProperty(proto, key, {
    configurable: true,
    enumerable: true,
    get: lazyGet,
    set: lazySet,
  });
}

/**
 * Wraps the computed getter on `proto[key]` so that the first access to a
 * target instance installs an instance-level reactive computed. Preserves an
 * un-decorated setter that pairs with the getter, if present.
 */
export function installMixinComputed(
  proto: object,
  key: string | symbol,
  getter: (this: object) => unknown,
  options?: DecoratorOptionType,
  explicitSetter?: (this: object, val: unknown) => void
): void {
  const existing = Object.getOwnPropertyDescriptor(proto, key);
  // Prefer an explicitly-passed setter (captured from the mixin's original
  // prototype). Otherwise fall back to the existing descriptor's setter, but
  // only if it isn't one we already installed — inheriting another mixin's
  // lazy setter would cause infinite recursion through the Computed wrapper.
  const setter = explicitSetter
    ?? (existing && !isMixinInstalled(existing)
      ? (existing.set as ((val: unknown) => void) | undefined)
      : undefined);

  const lazyGet = function lazyComputedGet(this: object) {
    if (!getIntegration()) return getter.call(this);

    if (markInitialized(this, key)) {
      define(this, key as string, computedDescriptor(getter, setter, options));
    }

    return (this as Record<string | symbol, unknown>)[key as string];
  } as MixinMarkedFn;

  const lazySet = function lazyComputedSet(this: object, val: unknown) {
    if (!getIntegration()) {
      setter?.call(this, val);

      return;
    }

    if (markInitialized(this, key)) {
      define(this, key as string, computedDescriptor(getter, setter, options));
    }

    (this as Record<string | symbol, unknown>)[key as string] = val;
  } as MixinMarkedFn;

  lazyGet.__madroneMixin = true;
  lazySet.__madroneMixin = true;

  Object.defineProperty(proto, key, {
    configurable: true,
    enumerable: true,
    get: lazyGet,
    set: lazySet,
  });
}
