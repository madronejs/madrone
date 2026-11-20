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
  OBSERVER_SYMBOL, dependTracker, observerClearAll, observerSweep, schedule, trackerChanged,
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
  /**
   * Let the reactive values this observer depends on hold it weakly, so it can be
   * garbage collected with whatever owns it even if they live on. Only for an observer
   * that something else keeps while it is in use, like an object's computed property:
   * a weak observer that nothing references stops running its hooks.
   */
  weak?: boolean,
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
    this.ref = options.weak ? new WeakRef(this) : undefined;
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
  /** Counts the getter's runs, to tell which dependencies the latest one read */
  epoch = 0;
  /** What dependencies hold when the observer is weak */
  readonly ref?: WeakRef<ObservableItem<T>>;
  private cachedVal: T;
  /** What the latest run threw, cached like a value (boxed, since anything can be thrown) */
  private cachedError?: { thrown: unknown };

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
    observerClearAll(this);
    this.alive = false;
    this.dirty = false;
    this.cachedVal = undefined;
    this.cachedError = undefined;
    this.prev = undefined;
    // Drop the getter and hooks so whatever they capture (a watcher's handler, the objects
    // its getter reads) can be collected even while something still holds the disposer
    this.get = undefined;
    this.hooks = {} as typeof this.hooks;
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
    if (!this.alive || this.dirty) {
      return;
    }

    this.dirty = true;
    trackerChanged(this, OBSERVER_SYMBOL);
    // store the previous value for the onChange
    this.prev = this.cachedVal;
    this.cachedVal = undefined;
    this.callHook(OBSERVER_HOOK.onImmediateChange);

    if (this.hooks[OBSERVER_HOOK.onChange]) {
      schedule(() => this.notifyChange());
    } else {
      // nothing will read it, so don't hold a strong reference to the prev
      this.prev = undefined;
    }
  }

  private notifyChange() {
    this.callHook(OBSERVER_HOOK.onChange);
    // don't hold a strong reference to the prev
    this.prev = undefined;
  }

  run(): T {
    if (!this.alive) return undefined;

    // A cached result is current, so there is no getter to run and nothing to collect
    if (this.dirty || !this.cache) {
      this.epoch += 1;
      this.wrap(() => {
        try {
          this.cachedVal = this.get();
          this.cachedError = undefined;
        } catch (error) {
          // Cache the error like a value: reads rethrow it until a dependency changes,
          // instead of re-running a getter that keeps failing or returning a stale value.
          this.cachedVal = undefined;
          this.cachedError = { thrown: error };
        } finally {
          this.dirty = false;

          if (this.alive) {
            // Drop the dependencies this run didn't read, even when the getter threw
            observerSweep(this);
          } else {
            // Disposed by its own getter: drop what the rest of the run read
            observerClearAll(this);
          }
        }
      });

      // Still give this run's result to the caller, but don't keep it, and don't let the
      // reader depend on an observer that will never change again
      if (!this.alive) {
        const { cachedVal, cachedError } = this;

        this.cachedVal = undefined;
        this.cachedError = undefined;

        if (cachedError) throw cachedError.thrown;

        return cachedVal;
      }
    }

    // Whoever is reading depends on this observer even when it threw, so it hears about
    // the change that lets it recover
    dependTracker(this, OBSERVER_SYMBOL);
    this.callHook(OBSERVER_HOOK.onGet);

    if (this.cachedError) throw this.cachedError.thrown;

    return this.cachedVal;
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
