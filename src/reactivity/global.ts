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

/** Mapping from target object to its reactive proxy */
const TARGET_TO_PROXY = new WeakMap<object, object>();
/** Mapping from reactive proxy to its underlying target object */
const PROXY_TO_TARGET = new WeakMap<object, object>();
/** Mapping from reactive proxy to the observers that depend on it */
const PROXY_TO_OBSERVERS = new WeakMap<
  object,
  Map<DependencyKey, Set<ObservableItem<unknown>>>
>();
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

/** Gets all observers watching a given proxy */
export const getObservers = (tracker: object) => PROXY_TO_OBSERVERS.get(getProxy(tracker));

/**
 * Registers a target/proxy pair in the tracking system.
 * @internal
 */
export const addReactive = <T extends object>(target: T, proxy: T): void => {
  TARGET_TO_PROXY.set(target, proxy);
  PROXY_TO_TARGET.set(proxy, target);
};

const doTasksIfNeeded = (): void => {
  if (SCHEDULER_ID === null) {
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
  }
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
      PROXY_TO_OBSERVERS.get(trk)?.get(key)?.delete(obs);
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
      PROXY_TO_OBSERVERS.get(trk)?.get(key)?.delete(obs);
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

  if (!OBSERVER_TO_PROXIES.has(current)) {
    OBSERVER_TO_PROXIES.set(current, new Map());
  }

  if (!PROXY_TO_OBSERVERS.has(trk)) {
    PROXY_TO_OBSERVERS.set(trk, new Map());
  }

  const observers = PROXY_TO_OBSERVERS.get(trk);
  const trackers = OBSERVER_TO_PROXIES.get(current);

  if (!observers.has(key)) {
    observers.set(key, new Set());
  }

  if (!trackers.has(key)) {
    trackers.set(key, new Set());
  }

  const observerSet = observers.get(key);
  const trackerSet = trackers.get(key);

  observerSet.add(current);
  trackerSet.add(trk);
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
    for (const obs of observers.get(key)) {
      // tell the observer it needs to run again
      obs.setDirty();

      // Only clear the dependency if the observer is NOT currently running.
      // If it's running, it's in the middle of collecting new dependencies
      // and we don't want to clear dependencies that were just registered.
      if (!isObserverRunning(obs)) {
        observerClear(obs, key);
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
