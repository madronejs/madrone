import {
  OBSERVER_SYMBOL,
  dependTracker,
  getDependencies,
  observerClear,
  schedule,
  trackerChanged,
} from './global';

const GLOBAL_STACK = [];

export function getCurrentObserver() {
  return GLOBAL_STACK[GLOBAL_STACK.length - 1];
}

const ObserverPrototype = {
  callHook(name) {
    if (typeof this.hooks[name] === 'function') {
      this.hooks[name](this);
    }
  },

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
  },

  wrap(cb) {
    GLOBAL_STACK.push(this);
    const val = cb();
    GLOBAL_STACK.pop();
    return val;
  },

  setDirty() {
    if (this.alive && !this.dirty) {
      this.dirty = true;
      trackerChanged(this, OBSERVER_SYMBOL);
      // store the previous value for the onChange
      this.prev = this.cachedVal;
      this.callHook('onImmediateChange');
      schedule(() => this.notifyChange());
    }
  },

  notifyChange() {
    this.callHook('onChange');
    // don't hold a strong reference to the prev
    this.prev = undefined;
  },

  getDependencies() {
    return getDependencies(this);
  },

  run() {
    if (!this.alive) return undefined;

    const val = this.wrap(() => {
      if ((this.cache && this.dirty) || !this.cache) {
        this.cachedVal = this.get();
        this.dirty = false;
      }

      return this.cachedVal;
    });

    dependTracker(this, OBSERVER_SYMBOL);
    this.callHook('onGet');

    return val;
  },

  /**
   * The value of the observer
   */
  get value() {
    return this.run();
  },

  set value(val) {
    if (typeof this.set === 'function') {
      this.set(val);
      this.callHook('onSet');
    } else {
      throw new Error(`No setter defined for "${this.name}"`);
    }
  },
}

/**
 * @param {Object} options the observer options
 */
export default function Observer({ name, get, set, cache = true, onGet, onSet, onChange, onImmediateChange } = {} as any) {
  const obs = Object.create(ObserverPrototype);
  const props = {
    name: name,
    get: get,
    set: set,
    hooks: { onGet, onSet, onChange, onImmediateChange },
    alive: true,
    cache: !!cache,
    dirty: true,
    cachedVal: undefined,
  }
  Object.assign(obs, props);

  return obs as typeof ObserverPrototype & typeof props;
}
