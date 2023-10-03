import { getCurrentObserver, ObservableItem } from './Observer';

// constants
export const KEYS_SYMBOL = Symbol('keys');
export const OBSERVER_SYMBOL = Symbol('computed');

/** Mapping from target object to its proxy */
const TARGET_TO_PROXY = new WeakMap();
/** Mapping from proxy to the object it proxies */
const PROXY_TO_TARGET = new WeakMap();
/** Mapping from proxy to the observers that depend on it */
const PROXY_TO_OBSERVERS = new WeakMap<
  object,
  Map<string | symbol | ObservableItem<any>, Set<ObservableItem<any>>>
>();
/** Mapping from observer to its dependencies */
const OBSERVER_TO_PROXIES = new WeakMap<
  ObservableItem<any>,
  Map<string | symbol | ObservableItem<any>, Set<any>>
>();
/** List of scheduled tasks */
let TASK_QUEUE = [];
/** The id of the timeout that will handle all scheduled tasks */
let SCHEDULER_ID = null;

/** Check if the current target has a proxy associated with it */
export const isReactiveTarget = (target) => TARGET_TO_PROXY.has(target);
/** Check if the current proxy has a target object */
export const isReactive = (trk) => PROXY_TO_TARGET.has(trk);
export const getReactive = (target) => TARGET_TO_PROXY.get(target);
export const getTarget = (tracker) => PROXY_TO_TARGET.get(tracker);
export const getProxy = (targetOrProxy) => (isReactive(targetOrProxy) ? targetOrProxy : getReactive(targetOrProxy));
export const toRaw = (targetOrProxy) => (isReactive(targetOrProxy) ? getTarget(targetOrProxy) : targetOrProxy);

export const getDependencies = (observer) => OBSERVER_TO_PROXIES.get(observer);
/** Get the list of items that are observing a given proxy */
export const getObservers = (tracker) => PROXY_TO_OBSERVERS.get(getProxy(tracker));

export const addReactive = (target, proxy) => {
  TARGET_TO_PROXY.set(target, proxy);
  PROXY_TO_TARGET.set(proxy, target);
};
const doTasksIfNeeded = () => {
  if (SCHEDULER_ID === null) {
    SCHEDULER_ID = setTimeout(() => {
      const queue = TASK_QUEUE;

      TASK_QUEUE = [];

      while (queue.length > 0) {
        queue.shift()();
      }

      SCHEDULER_ID = null;
    });
  }
};
export const schedule = (task) => {
  TASK_QUEUE.push(task);
  doTasksIfNeeded();
};

/**
 * Clear all of the current dependencies an observer has
 * @param {Observable} obs the observable to clear it's dependencies
 * @param {String} key the key to clear
 * @returns {void}
 */
export const observerClear = (
  obs: ObservableItem<any>,
  key: string | symbol | ObservableItem<any>
) => {
  const proxies = OBSERVER_TO_PROXIES.get(obs);
  const trackers = proxies?.get(key);

  if (trackers) {
    for (const trk of trackers) {
      PROXY_TO_OBSERVERS.get(trk).delete(obs);
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
 * @param {trackable} trk the trackable item we're depending on
 * @param {String} key the key to depend on
 * @returns {void}
 */
export const dependTracker = (trk: object, key: string | symbol | ObservableItem<any>) => {
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
 * @returns {void}
 */
export const dependTarget = (target: object, key: string | symbol) => {
  const trk = getReactive(target);

  if (trk) {
    dependTracker(trk, key);
  }
};

/**
 * Tell all observers of a trackable that the trackable changed
 * @param trk the trackable that changed
 * @param key the key on the trackable that changed
 * @return {void}
 */
export const trackerChanged = (trk, key) => {
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
export const targetChanged = (target: any, key: string | symbol) => {
  trackerChanged(getReactive(target), key);
};
