/**
 * @module reactivity/global
 *
 * Global state and dependency tracking for the reactivity system.
 *
 * This module manages the core data structures that enable automatic
 * dependency tracking and change notification. It maintains mappings
 * between reactive proxies, their targets, and the observers that
 * depend on them.
 *
 * @internal
 */

import { getCurrentObserver, isObserverRunning, ObservableItem } from './Observer';

// constants
/** Symbol used to track when an object's keys change */
export const KEYS_SYMBOL = Symbol('keys');
/** Symbol used for observer dependency tracking */
export const OBSERVER_SYMBOL = Symbol('computed');

type DependencyKey = string | symbol | ObservableItem<unknown>;
/** A weak observer is held through its WeakRef, so a long-lived dependency does not keep it alive */
type ObserverEntry = ObservableItem<unknown> | WeakRef<ObservableItem<unknown>>;

/** Mapping from target object to its reactive proxy */
const TARGET_TO_PROXY = new WeakMap<object, object>();
/** Mapping from reactive proxy to its underlying target object */
const PROXY_TO_TARGET = new WeakMap<object, object>();
/** Mapping from reactive proxy to the observers that depend on it */
const PROXY_TO_OBSERVERS = new WeakMap<
  object,
  Map<DependencyKey, Set<ObserverEntry>>
>();
/** Size at which an observer set is next swept for collected weak observers */
const SWEEP_AT = new WeakMap<Set<ObserverEntry>, number>();
const MIN_SWEEP_SIZE = 64;
/** Mapping from observer to the proxies it depends on */
const OBSERVER_TO_PROXIES = new WeakMap<
  ObservableItem<unknown>,
  Map<DependencyKey, Set<object>>
>();
/** Queue of tasks waiting to be executed */
let TASK_QUEUE: (() => void)[] = [];
/** Scheduler ID to prevent multiple schedulers from running */
let SCHEDULER_ID: symbol | null = null;

/** Checks if the given object has a reactive proxy associated with it */
export const isReactiveTarget = (target: object): boolean => TARGET_TO_PROXY.has(target);

/** Checks if the given object is a reactive proxy */
export const isReactive = (trk: object): boolean => PROXY_TO_TARGET.has(trk);

/** Gets the reactive proxy for a target object */
export const getReactive = <T extends object>(target: T): T | undefined => TARGET_TO_PROXY.get(target) as T;

/** Gets the underlying target for a reactive proxy */
export const getTarget = <T extends object>(tracker: T): T | undefined => PROXY_TO_TARGET.get(tracker) as T;

/** Gets the proxy for an object, whether passed a target or proxy */
export const getProxy = <T extends object>(targetOrProxy: T): T | undefined => (
  isReactive(targetOrProxy) ? targetOrProxy : getReactive(targetOrProxy)
);

/**
 * Unwraps a reactive proxy to get the raw underlying object.
 *
 * If the object is not a proxy, returns it unchanged.
 */
export const toRaw = <T extends object>(targetOrProxy: T): T => (
  isReactive(targetOrProxy) ? getTarget(targetOrProxy) : targetOrProxy
);

/** Gets all dependencies for an observer */
export const getDependencies = (observer: ObservableItem<unknown>) => OBSERVER_TO_PROXIES.get(observer);

/** Gets all observers watching a given proxy; a weak observer appears as its WeakRef */
export const getObservers = (tracker: object) => PROXY_TO_OBSERVERS.get(getProxy(tracker));

/**
 * How many strong observers depend on each weak observer. While a weak observer has any,
 * its sources hold it strongly, so a watcher reading a computed whose owner is otherwise
 * unreferenced stays reachable from the source, as it would if the computed were strong.
 */
const STRONG_DEPENDENTS = new WeakMap<ObservableItem<unknown>, number>();

/** Whether the observer's sources currently hold it strongly */
const isHeldStrongly = (obs: ObservableItem<unknown>): boolean => (
  !obs.ref || (STRONG_DEPENDENTS.get(obs) ?? 0) > 0
);

const entryOf = (obs: ObservableItem<unknown>): ObserverEntry => (isHeldStrongly(obs) ? obs : obs.ref);

const observerOf = (entry: ObserverEntry): ObservableItem<unknown> | undefined => (
  entry instanceof WeakRef ? entry.deref() : entry
);

// A source that never changes never clears its set, so drop the entries of collected
// observers whenever the set has doubled since the last sweep.
const sweepIfNeeded = (observerSet: Set<ObserverEntry>): void => {
  if (observerSet.size < (SWEEP_AT.get(observerSet) ?? MIN_SWEEP_SIZE)) return;

  for (const entry of observerSet) {
    if (!observerOf(entry)) observerSet.delete(entry);
  }

  SWEEP_AT.set(observerSet, Math.max(MIN_SWEEP_SIZE, observerSet.size * 2));
};

// Only an observer is depended on under OBSERVER_SYMBOL
const weakObserverDependency = (trk: object, key: DependencyKey): ObservableItem<unknown> | undefined => (
  key === OBSERVER_SYMBOL && (trk as ObservableItem<unknown>).ref ? trk as ObservableItem<unknown> : undefined
);

// Switch how an observer's sources hold it, and pass the change on to the weak observers
// it depends on, since it is now (or no longer) a strong dependent of theirs.
const setHeldStrongly = (obs: ObservableItem<unknown>, isStrong: boolean): void => {
  const from = isStrong ? obs.ref : obs;
  const to = isStrong ? obs : obs.ref;
  const proxies = OBSERVER_TO_PROXIES.get(obs);

  if (!proxies) return;

  for (const [key, trackers] of proxies) {
    for (const trk of trackers) {
      const observerSet = PROXY_TO_OBSERVERS.get(trk)?.get(key);

      if (observerSet?.delete(from)) observerSet.add(to);

      const dependency = weakObserverDependency(trk, key);

      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      if (dependency) (isStrong ? addStrongDependent : removeStrongDependent)(dependency);
    }
  }
};

const addStrongDependent = (obs: ObservableItem<unknown>): void => {
  const count = STRONG_DEPENDENTS.get(obs) ?? 0;

  STRONG_DEPENDENTS.set(obs, count + 1);

  if (count === 0) setHeldStrongly(obs, true);
};

const removeStrongDependent = (obs: ObservableItem<unknown>): void => {
  const count = STRONG_DEPENDENTS.get(obs) ?? 0;

  if (count <= 1) {
    STRONG_DEPENDENTS.delete(obs);

    if (count === 1) setHeldStrongly(obs, false);
  } else {
    STRONG_DEPENDENTS.set(obs, count - 1);
  }
};

/** Removes the observer's entry from a dependency it no longer tracks */
const dropDependency = (obs: ObservableItem<unknown>, trk: object, key: DependencyKey): void => {
  PROXY_TO_OBSERVERS.get(trk)?.get(key)?.delete(entryOf(obs));

  const dependency = weakObserverDependency(trk, key);

  if (dependency && isHeldStrongly(obs)) removeStrongDependent(dependency);
};

/**
 * Registers a target/proxy pair in the tracking system.
 * @internal
 */
export const addReactive = <T extends object>(target: T, proxy: T): void => {
  TARGET_TO_PROXY.set(target, proxy);
  PROXY_TO_TARGET.set(proxy, target);
};

const doTasksIfNeeded = (): void => {
  if (SCHEDULER_ID !== null) {
    return;
  }

  SCHEDULER_ID = Symbol('scheduler');
  queueMicrotask(() => {
    try {
      // Process until queue is truly empty, including tasks added during execution
      while (TASK_QUEUE.length > 0) {
        const queue = TASK_QUEUE;

        TASK_QUEUE = [];

        for (const task of queue) {
          try {
            task();
          } catch (error) {
            // Log error but continue processing other tasks
            // eslint-disable-next-line no-console
            console.error('Unhandled error in scheduled task:', error);
          }
        }
      }
    } finally {
      // Always reset scheduler ID so future tasks can be scheduled
      SCHEDULER_ID = null;
    }
  });
};

/**
 * Schedules a task to run asynchronously in the next microtask.
 *
 * Tasks are batched and executed together. Used to batch multiple
 * change notifications into a single update cycle.
 *
 * @param task - The function to execute
 * @internal
 */
export const schedule = (task: () => void): void => {
  TASK_QUEUE.push(task);
  doTasksIfNeeded();
};

/**
 * Clear a specific dependency key for an observer
 * @param obs the observable to clear dependencies for
 * @param key the key to clear
 */
export const observerClear = (
  obs: ObservableItem<unknown>,
  key: DependencyKey
): void => {
  const proxies = OBSERVER_TO_PROXIES.get(obs);
  const trackers = proxies?.get(key);

  if (trackers) {
    for (const trk of trackers) {
      dropDependency(obs, trk, key);
    }

    trackers.clear();
    proxies.delete(key);

    if (proxies.size === 0) {
      OBSERVER_TO_PROXIES.delete(obs);
    }
  }
};

/**
 * Clear ALL dependencies for an observer.
 * Called before re-running to ensure stale dependencies are removed.
 * @param obs the observable to clear all dependencies for
 */
export const observerClearAll = (obs: ObservableItem<unknown>): void => {
  const proxies = OBSERVER_TO_PROXIES.get(obs);

  if (!proxies) return;

  for (const [key, trackers] of proxies) {
    for (const trk of trackers) {
      dropDependency(obs, trk, key);
    }
  }

  OBSERVER_TO_PROXIES.delete(obs);
};

/**
 * Make an observer depend on a trackable item
 * @param trk the trackable item we're depending on
 * @param key the key to depend on
 */
export const dependTracker = (trk: object, key: DependencyKey): void => {
  const current = getCurrentObserver();

  if (!current) return;

  let trackers = OBSERVER_TO_PROXIES.get(current);

  if (!trackers) {
    trackers = new Map();
    OBSERVER_TO_PROXIES.set(current, trackers);
  }

  let trackerSet = trackers.get(key);

  if (!trackerSet) {
    trackerSet = new Set();
    trackers.set(key, trackerSet);
  } else if (trackerSet.has(trk)) {
    // already depending on it: the source has this observer's entry too
    return;
  }

  trackerSet.add(trk);

  let observers = PROXY_TO_OBSERVERS.get(trk);

  if (!observers) {
    observers = new Map();
    PROXY_TO_OBSERVERS.set(trk, observers);
  }

  let observerSet = observers.get(key);

  if (!observerSet) {
    observerSet = new Set();
    observers.set(key, observerSet);
  }

  const entry = entryOf(current);

  if (!observerSet.has(entry)) {
    sweepIfNeeded(observerSet);
    observerSet.add(entry);
  }

  const dependency = weakObserverDependency(trk, key);

  if (dependency && isHeldStrongly(current)) addStrongDependent(dependency);
};

/**
 * Make an observer depend on a raw target
 * @param target the target to depend on
 * @param key the key to depend on
 */
export const dependTarget = (target: object, key: string | symbol): void => {
  const trk = getReactive(target);

  if (trk) {
    dependTracker(trk, key);
  }
};

/**
 * Tell all observers of a trackable that the trackable changed
 * @param trk the trackable that changed
 * @param key the key on the trackable that changed
 */
export const trackerChanged = (trk: object, key: DependencyKey): void => {
  const observers = PROXY_TO_OBSERVERS.get(trk);

  if (observers?.get(key)) {
    const observerSet = observers.get(key);

    for (const entry of observerSet) {
      const obs = observerOf(entry);

      if (obs) {
        // tell the observer it needs to run again
        obs.setDirty();

        // Only clear the dependency if the observer is NOT currently running.
        // If it's running, it's in the middle of collecting new dependencies
        // and we don't want to clear dependencies that were just registered.
        if (!isObserverRunning(obs)) {
          observerClear(obs, key);
        }
      } else {
        observerSet.delete(entry);
      }
    }
  }
};

/**
 * Tell all observers listening to this target that this changed
 * @param target the target that changed
 * @param key the key on the trackable that changed
 */
export const targetChanged = (target: object, key: string | symbol): void => {
  trackerChanged(getReactive(target), key);
};
