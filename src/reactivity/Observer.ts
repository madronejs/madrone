/**
 * @module Observer
 *
 * Low-level observable implementation with dependency tracking.
 *
 * Observer is the foundation of Madrone's reactivity system. It tracks
 * which reactive properties are accessed during computation and schedules
 * updates when those dependencies change.
 */

import {
  OBSERVER_SYMBOL, dependTracker, observerClear, schedule, trackerChanged,
} from './global';

const GLOBAL_STACK: Array<ObservableItem<unknown>> = [];

/**
 * Returns the currently running Observer, if any.
 *
 * Used internally to track which Observer should be notified when
 * reactive properties are accessed.
 *
 * @returns The current Observer or undefined if none is running
 * @internal
 */
export function getCurrentObserver(): ObservableItem<unknown> | undefined {
  return GLOBAL_STACK.at(-1);
}

/**
 * Lifecycle hooks that can be called on an Observer.
 */
export enum OBSERVER_HOOK {
  /** Called when the computed value is read */
  onGet = 'onGet',
  /** Called when a writable computed is set */
  onSet = 'onSet',
  /** Called asynchronously after dependencies change */
  onChange = 'onChange',
  /** Called synchronously when dependencies change (before async scheduling) */
  onImmediateChange = 'onImmediateChange',
}

/**
 * Type for Observer lifecycle hook callbacks.
 * @typeParam T - The type of the observed value
 */
export type ObservableHookType<T> = (obs: ObservableItem<T>) => void;

/**
 * Collection of lifecycle hooks for an Observer.
 * @typeParam T - The type of the observed value
 */
export type ObservableHooksType<T> = {
  /** Called when the value is accessed */
  onGet?: ObservableHookType<T>,
  /** Called when the value is set (writable computed only) */
  onSet?: ObservableHookType<T>,
  /** Called asynchronously after dependencies change */
  onChange?: ObservableHookType<T>,
  /** Called synchronously when dependencies change */
  onImmediateChange?: ObservableHookType<T>,
};

/**
 * Configuration options for creating an Observer.
 * @typeParam T - The type of the observed value
 */
export type ObservableOptions<T> = {
  /** Getter function that computes the value */
  get: () => T,
  /** Optional name for debugging */
  name?: string,
  /** Optional setter for writable computed values */
  set?: (val: T) => void,
  /** Whether to cache the computed value (default: true) */
  cache?: boolean,
} & ObservableHooksType<T>;

/**
 * Core observable class that tracks dependencies and caches computed values.
 *
 * ObservableItem wraps a getter function and automatically tracks which
 * reactive properties are accessed when the getter runs. When those
 * dependencies change, the cached value is invalidated and change hooks
 * are called.
 *
 * @typeParam T - The type of the observed value
 */
class ObservableItem<T> {
  /**
   * Factory method to create a new ObservableItem.
   * @internal
   */
  static create<CType>(...args: ConstructorParameters<typeof ObservableItem<CType>>) {
    return new ObservableItem<CType>(...args);
  }

  /**
   * Creates a new ObservableItem.
   * @param options - Configuration options
   */
  constructor(options: ObservableOptions<T>) {
    this.name = options.name;
    this.get = options.get;
    this.set = options.set;
    this.cache = !!(options.cache ?? true);
    this.alive = true;
    this.dirty = true;
    this.cachedVal = undefined;
    this.hooks = {
      [OBSERVER_HOOK.onGet]: options[OBSERVER_HOOK.onGet],
      [OBSERVER_HOOK.onSet]: options[OBSERVER_HOOK.onSet],
      [OBSERVER_HOOK.onChange]: options[OBSERVER_HOOK.onChange],
      [OBSERVER_HOOK.onImmediateChange]: options[OBSERVER_HOOK.onImmediateChange],
    };
  }

  /** Name for debugging purposes */
  name: string;
  /** Whether this observer is still active */
  alive: boolean;
  /** Whether the cached value needs to be recomputed */
  dirty: boolean;
  /** The previous value (available during onChange) */
  prev: T;
  /** Whether to cache the computed value */
  cache: boolean;
  private cachedVal: T;

  private hooks: Record<OBSERVER_HOOK, (obs: ObservableItem<T>) => unknown>;
  private get: () => T;
  private set: (val: T) => void;

  private callHook(name: OBSERVER_HOOK) {
    if (typeof this.hooks[name] === 'function') {
      this.hooks[name](this);
    }
  }

  /**
   * Stop observing and dispose of the observer
   * @returns {void}
   */
  dispose() {
    observerClear(this, OBSERVER_SYMBOL);
    this.alive = false;
    this.dirty = false;
    this.cachedVal = undefined;
    this.prev = undefined;
  }

  private wrap<CBType>(cb: () => CBType): CBType {
    GLOBAL_STACK.push(this);
    try {
      return cb();
    } finally {
      GLOBAL_STACK.pop();
    }
  }

  setDirty() {
    if (this.alive && !this.dirty) {
      this.dirty = true;
      trackerChanged(this, OBSERVER_SYMBOL);
      // store the previous value for the onChange
      this.prev = this.cachedVal;
      this.cachedVal = undefined;
      this.callHook(OBSERVER_HOOK.onImmediateChange);
      schedule(() => this.notifyChange());
    }
  }

  private notifyChange() {
    this.callHook(OBSERVER_HOOK.onChange);
    // don't hold a strong reference to the prev
    this.prev = undefined;
  }

  run(): T {
    if (!this.alive) return undefined;

    const val = this.wrap(() => {
      if ((this.cache && this.dirty) || !this.cache) {
        try {
          this.cachedVal = this.get();
        } finally {
          // Always reset dirty to prevent infinite retry loops on persistent errors.
          // If the getter throws, we'll rethrow but won't be stuck dirty.
          this.dirty = false;
        }
      }

      return this.cachedVal;
    });

    dependTracker(this, OBSERVER_SYMBOL);
    this.callHook(OBSERVER_HOOK.onGet);

    return val;
  }

  /** The value of the observer */
  get value() {
    return this.run();
  }

  set value(val) {
    if (typeof this.set === 'function') {
      this.set(val);
      this.callHook(OBSERVER_HOOK.onSet);
    } else {
      throw new TypeError(`No setter defined for "${this.name}"`);
    }
  }
}

export { ObservableItem };

/**
 * Creates a new Observer that tracks dependencies and caches computed values.
 *
 * This is the low-level API for creating reactive computations. Most users
 * should use `Computed` or `Watcher` instead, which provide more convenient
 * interfaces on top of Observer.
 *
 * @typeParam T - The type of the observed value
 * @param args - Configuration options for the observer
 * @returns An ObservableItem instance
 *
 * @example
 * ```ts
 * const obs = Observer({
 *   get: () => state.count * 2,
 *   onChange: (o) => console.log('Changed to:', o.value)
 * });
 *
 * console.log(obs.value); // Runs getter, tracks dependencies
 * state.count = 5; // Triggers onChange
 * ```
 */
export default function Observer<T = unknown>(...args: Parameters<typeof ObservableItem.create<T>>) {
  return ObservableItem.create<T>(...args);
}
