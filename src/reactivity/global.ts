import { getCurrentObserver } from './Observer';

// constants
export const KEYS_SYMBOL = Symbol('keys');
export const OBSERVER_SYMBOL = Symbol('computed');

/**
 * Mapping from target object to its proxy
 * @memberof Reactivity
 */
const targetToTracker = new WeakMap();
/**
 * Mapping from proxy to the object it proxies
 * @memberof Reactivity
 */
const trackerToTarget = new WeakMap();
/**
 * Mapping from proxy to the observers that depend on it
 * @memberof Reactivity
 */
const trackerToObservers = new WeakMap();
/**
 * Mapping from observer to its dependencies
 * @memberof Reactivity
 */
const observerToTrackers = new WeakMap();
/**
 * List of scheduled tasks
 * @memberof Reactivity
 */
let taskQueue = [];
/**
 * The id of the timeout that will handle all scheduled tasks
 * @memberof Reactivity
 */
let schedulerId = null;

export const isReactiveTarget = (target) => targetToTracker.has(target);
export const isReactive = (trk) => trackerToTarget.has(trk);
export const getReactive = (target) => targetToTracker.get(target);
export const getTarget = (tracker) => trackerToTarget.get(tracker);
export const getDependencies = (observer) => observerToTrackers.get(observer);
export const addReactive = (target, proxy) => {
  targetToTracker.set(target, proxy);
  trackerToTarget.set(proxy, target);
};
const doTasksIfNeeded = () => {
  if (schedulerId === null) {
    schedulerId = setTimeout(() => {
      const queue = taskQueue;

      taskQueue = [];

      while (queue.length) {
        queue.shift()();
      }

      schedulerId = null;
    });
  }
};
export const schedule = (task) => {
  taskQueue.push(task);
  doTasksIfNeeded();
};

/**
 * Clear all of the current dependencies an observer has
 * @memberof Reactivity
 * @param {Observable} obs the observable to clear it's dependencies
 * @param {String} key the key to clear
 * @returns {void}
 */
export const observerClear = (obs, key) => {
  const trackers = observerToTrackers.get(obs)?.get(key);

  if (trackers) {
    trackers.forEach((trk) => {
      trackerToObservers.get(trk).delete(obs);
    });

    trackers.clear();
  }
};

/**
 * Make an observer depend on a trackable item
 * @memberof Reactivity
 * @param {trackable} trk the trackable item we're depending on
 * @param {String} key the key to depend on
 * @returns {void}
 */
export const dependTracker = (trk, key) => {
  const current = getCurrentObserver();

  if (!current) return;

  if (!observerToTrackers.has(current)) {
    observerToTrackers.set(current, new Map());
  }

  if (!trackerToObservers.has(trk)) {
    trackerToObservers.set(trk, new Map());
  }

  const observers = trackerToObservers.get(trk);
  const trackers = observerToTrackers.get(current);

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
 * @memberof Reactivity
 * @param {any} target the target to depend on
 * @param {String} key the key to depend on
 * @returns {void}
 */
export const dependTarget = (target, key) => {
  const trk = getReactive(target);

  if (trk) {
    dependTracker(trk, key);
  }
};

/**
 * Tell all observers of a trackable that the trackable changed
 * @memberof Reactivity
 * @param {trackable} trk the trackable that changed
 * @param {String} key the key on the trackable that changed
 * @return {void}
 */
export const trackerChanged = (trk, key) => {
  const observers = trackerToObservers.get(trk);

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
 * @memberof Reactivity
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
