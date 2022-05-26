import {
  OBSERVER_SYMBOL,
  dependTracker,
  getDependencies,
  observerClear,
  schedule,
  trackerChanged,
} from './global';

// eslint-disable-next-line no-use-before-define
const GLOBAL_STACK: Array<ObservableItem<any>> = [];

export function getCurrentObserver() {
  return GLOBAL_STACK[GLOBAL_STACK.length - 1];
}

class ObservableItem<T> {
  static create(...args: ConstructorParameters<typeof ObservableItem>) {
    return new ObservableItem(...args);
  }

  constructor(options: {
    get: () => T;
    name?: string;
    set?: (val: T) => void;
    cache?: boolean;
    onGet?: (obs: ObservableItem<T>) => void;
    onSet?: (obs: ObservableItem<T>) => void;
    onChange?: (obs: ObservableItem<T>) => void;
    onImmediateChange?: (obs: ObservableItem<T>) => void;
  }) {
    this.name = options.name;
    this.get = options.get;
    this.set = options.set;
    this.cache = !!(options.cache ?? true);
    this.alive = true;
    this.dirty = true;
    this.cachedVal = undefined;
    this.hooks = {
      onGet: options.onGet,
      onSet: options.onSet,
      onChange: options.onChange,
      onImmediateChange: options.onImmediateChange,
    };
  }

  name: string;
  alive: boolean;
  dirty: boolean;
  cachedVal: T;
  prev: T;
  cache: boolean;
  // eslint-disable-next-line no-use-before-define
  private hooks: Record<string, (obs: ObservableItem<T>) => any>;
  private get: () => T;
  private set: (val: T) => void;

  private callHook(name) {
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

  private wrap<CBType>(cb: () => CBType) {
    GLOBAL_STACK.push(this);

    const val = cb();

    GLOBAL_STACK.pop();
    return val;
  }

  setDirty() {
    if (this.alive && !this.dirty) {
      this.dirty = true;
      trackerChanged(this, OBSERVER_SYMBOL);
      // store the previous value for the onChange
      this.prev = this.cachedVal;
      this.callHook('onImmediateChange');
      schedule(() => this.notifyChange());
    }
  }

  notifyChange() {
    this.callHook('onChange');
    // don't hold a strong reference to the prev
    this.prev = undefined;
  }

  getDependencies() {
    return getDependencies(this);
  }

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
  }

  /** The value of the observer */
  get value() {
    return this.run();
  }

  set value(val) {
    if (typeof this.set === 'function') {
      this.set(val);
      this.callHook('onSet');
    } else {
      throw new Error(`No setter defined for "${this.name}"`);
    }
  }
}

export { ObservableItem };

export default function Observer(...args: Parameters<typeof ObservableItem.create>) {
  return ObservableItem.create(...args);
}
