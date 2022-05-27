import { OBSERVER_SYMBOL, dependTracker, observerClear, schedule, trackerChanged } from './global';

// eslint-disable-next-line no-use-before-define
const GLOBAL_STACK: Array<ObservableItem<any>> = [];

export function getCurrentObserver() {
  return GLOBAL_STACK[GLOBAL_STACK.length - 1];
}

const OBSERVER_HOOKS = Object.freeze({
  onGet: 'onGet' as const,
  onSet: 'onSet' as const,
  onChange: 'onChange' as const,
  onImmediateChange: 'onImmediateChange' as const,
});

type ObserverHook = typeof OBSERVER_HOOKS[keyof typeof OBSERVER_HOOKS];

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
      [OBSERVER_HOOKS.onGet]: options[OBSERVER_HOOKS.onGet],
      [OBSERVER_HOOKS.onSet]: options[OBSERVER_HOOKS.onSet],
      [OBSERVER_HOOKS.onChange]: options[OBSERVER_HOOKS.onChange],
      [OBSERVER_HOOKS.onImmediateChange]: options[OBSERVER_HOOKS.onImmediateChange],
    };
  }

  name: string;
  alive: boolean;
  dirty: boolean;
  prev: T;
  cache: boolean;
  private cachedVal: T;
  // eslint-disable-next-line no-use-before-define
  private hooks: Record<ObserverHook, (obs: ObservableItem<T>) => any>;
  private get: () => T;
  private set: (val: T) => void;

  private callHook(name: ObserverHook) {
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
      this.callHook(OBSERVER_HOOKS.onImmediateChange);
      schedule(() => this.notifyChange());
    }
  }

  private notifyChange() {
    this.callHook(OBSERVER_HOOKS.onChange);
    // don't hold a strong reference to the prev
    this.prev = undefined;
  }

  run(): T {
    if (!this.alive) return undefined;

    const val = this.wrap(() => {
      if ((this.cache && this.dirty) || !this.cache) {
        this.cachedVal = this.get();
        this.dirty = false;
      }

      return this.cachedVal;
    });

    dependTracker(this, OBSERVER_SYMBOL);
    this.callHook(OBSERVER_HOOKS.onGet);

    return val;
  }

  /** The value of the observer */
  get value() {
    return this.run();
  }

  set value(val) {
    if (typeof this.set === 'function') {
      this.set(val);
      this.callHook(OBSERVER_HOOKS.onSet);
    } else {
      throw new Error(`No setter defined for "${this.name}"`);
    }
  }
}

export { ObservableItem };

export default function Observer(...args: Parameters<typeof ObservableItem.create>) {
  return ObservableItem.create(...args);
}
