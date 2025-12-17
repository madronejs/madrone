import { getCurrentObserver, ObservableItem } from './Observer';

// constants
export const KEYS_SYMBOL = Symbol('keys');
export const OBSERVER_SYMBOL = Symbol('computed');

type DependencyKey = string | symbol | ObservableItem<unknown>;

/** Mapping from target object to its proxy */
const TARGET_TO_PROXY = new WeakMap<object, object>();
/** Mapping from proxy to the object it proxies */
const PROXY_TO_TARGET = new WeakMap<object, object>();
/** Mapping from proxy to the observers that depend on it */
const PROXY_TO_OBSERVERS = new WeakMap<
  object,
  Map<DependencyKey, Set<ObservableItem<unknown>>>
>();
/** Mapping from observer to its dependencies */
const OBSERVER_TO_PROXIES = new WeakMap<
  ObservableItem<unknown>,
  Map<DependencyKey, Set<object>>
>();
/** List of scheduled tasks */
let TASK_QUEUE: (() => void)[] = [];
/** The id of the timeout that will handle all scheduled tasks */
let SCHEDULER_ID: symbol | null = null;

/** Check if the current target has a proxy associated with it */
export const isReactiveTarget = (target: object): boolean => TARGET_TO_PROXY.has(target);
/** Check if the current proxy has a target object */
export const isReactive = (trk: object): boolean => PROXY_TO_TARGET.has(trk);
export const getReactive = <T extends object>(target: T): T | undefined => TARGET_TO_PROXY.get(target) as T;
export const getTarget = <T extends object>(tracker: T): T | undefined => PROXY_TO_TARGET.get(tracker) as T;
export const getProxy = <T extends object>(targetOrProxy: T): T | undefined => (
  isReactive(targetOrProxy) ? targetOrProxy : getReactive(targetOrProxy)
);
export const toRaw = <T extends object>(targetOrProxy: T): T => (
  isReactive(targetOrProxy) ? getTarget(targetOrProxy) : targetOrProxy
);

export const getDependencies = (observer: ObservableItem<unknown>) => OBSERVER_TO_PROXIES.get(observer);
/** Get the list of items that are observing a given proxy */
export const getObservers = (tracker: object) => PROXY_TO_OBSERVERS.get(getProxy(tracker));

export const addReactive = <T extends object>(target: T, proxy: T): void => {
  TARGET_TO_PROXY.set(target, proxy);
  PROXY_TO_TARGET.set(proxy, target);
};

const doTasksIfNeeded = (): void => {
  if (SCHEDULER_ID === null) {
    SCHEDULER_ID = Symbol('scheduler');
    setTimeout(() => {
      const queue = TASK_QUEUE;

      TASK_QUEUE = [];

      while (queue.length > 0) {
        queue.shift()();
      }

      SCHEDULER_ID = null;
    });
  }
};

export const schedule = (task: () => void): void => {
  TASK_QUEUE.push(task);
  doTasksIfNeeded();
};

/**
 * Clear all of the current dependencies an observer has
 * @param obs the observable to clear it's dependencies
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
      PROXY_TO_OBSERVERS.get(trk)?.delete(obs);
    }

    trackers.clear();
    proxies.delete(key);

    if (proxies.size === 0) {
      OBSERVER_TO_PROXIES.delete(obs);
    }
  }
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
      // the observer is dirty, so we don't need to track it
      // anymore until the observer runs again
      observerClear(obs, key);
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
