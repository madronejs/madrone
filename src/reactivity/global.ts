import { getCurrentObserver, ObservableItem } from './Observer';

// constants
export const KEYS_SYMBOL = Symbol('keys');
export const OBSERVER_SYMBOL = Symbol('computed');

/** Mapping from target object to its proxy */
const TARGET_TO_TRACKER = new WeakMap();
/** Mapping from proxy to the object it proxies */
const TRACKER_TO_TARGET = new WeakMap();
/** Mapping from proxy to the observers that depend on it */
const TRACKER_TO_OBSERVERS = new WeakMap<
  object,
  Map<string | symbol | ObservableItem<any>, Set<ObservableItem<any>>>
>();
/** Mapping from observer to its dependencies */
const OBSERVER_TO_TRACKERS = new WeakMap<
  ObservableItem<any>,
  Map<string | symbol | ObservableItem<any>, Set<any>>
>();
/** List of scheduled tasks */
let TASK_QUEUE = [];
/** The id of the timeout that will handle all scheduled tasks */
let SCHEDULER_ID = null;

export const isReactiveTarget = (target) => TARGET_TO_TRACKER.has(target);
export const isReactive = (trk) => TRACKER_TO_TARGET.has(trk);
export const getReactive = (target) => TARGET_TO_TRACKER.get(target);
export const getTarget = (tracker) => TRACKER_TO_TARGET.get(tracker);
export const getDependencies = (observer) => OBSERVER_TO_TRACKERS.get(observer);
export const addReactive = (target, proxy) => {
  TARGET_TO_TRACKER.set(target, proxy);
  TRACKER_TO_TARGET.set(proxy, target);
};
const doTasksIfNeeded = () => {
  if (SCHEDULER_ID === null) {
    SCHEDULER_ID = setTimeout(() => {
      const queue = TASK_QUEUE;

      TASK_QUEUE = [];

      while (queue.length) {
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
  const trackers = OBSERVER_TO_TRACKERS.get(obs)?.get(key);

  if (trackers) {
    trackers.forEach((trk) => {
      TRACKER_TO_OBSERVERS.get(trk).delete(obs);
    });

    trackers.clear();
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

  if (!OBSERVER_TO_TRACKERS.has(current)) {
    OBSERVER_TO_TRACKERS.set(current, new Map());
  }

  if (!TRACKER_TO_OBSERVERS.has(trk)) {
    TRACKER_TO_OBSERVERS.set(trk, new Map());
  }

  const observers = TRACKER_TO_OBSERVERS.get(trk);
  const trackers = OBSERVER_TO_TRACKERS.get(current);

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
 * @param {any} target the target to depend on
 * @param {String} key the key to depend on
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
 * @param {trackable} trk the trackable that changed
 * @param {String} key the key on the trackable that changed
 * @return {void}
 */
export const trackerChanged = (trk, key) => {
  const observers = TRACKER_TO_OBSERVERS.get(trk);

  if (observers) {
    observers?.get(key)?.forEach((obs) => {
      // tell the observer it needs to run again
      obs.setDirty();
      // the observer is dirty, so we don't need to track it
      // anymore until the observer runs again
      observerClear(obs, key);
    });
  }
};

/**
 * Tell all observers listening to this target that this changed
 * @param {any} target the target that changed
 * @param {String} key the key on the trackable that changed
 * @returns {void}
 */
export const targetChanged = (target, key) => {
  const trk = getReactive(target);

  if (trk) {
    trackerChanged(trk, key);
  }
};
