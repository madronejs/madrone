import { OBSERVER_SYMBOL, dependTracker, observerClear, schedule, trackerChanged } from './global';

// eslint-disable-next-line no-use-before-define
const GLOBAL_STACK: Array<ObservableItem<any>> = [];

export function getCurrentObserver() {
  return GLOBAL_STACK[GLOBAL_STACK.length - 1];
}

export enum OBSERVER_HOOK {
  onGet = 'onGet',
  onSet = 'onSet',
  onChange = 'onChange',
  onImmediateChange = 'onImmediateChange',
}

export type ObservableHookType<T> = (obs: ObservableItem<T>) => void;

export type ObservableHooksType<T> = {
  onGet?: ObservableHookType<T>;
  onSet?: ObservableHookType<T>;
  onChange?: ObservableHookType<T>;
  onImmediateChange?: ObservableHookType<T>;
};

export type ObservableOptions<T> = {
  get: () => T;
  name?: string;
  set?: (val: T) => void;
  cache?: boolean;
} & ObservableHooksType<T>;

class ObservableItem<T> {
  static create<CType>(...args: ConstructorParameters<typeof ObservableItem<CType>>) {
    return new ObservableItem<CType>(...args);
  }

  constructor(options: ObservableOptions<T>) {
    this.name = options.name;
    this.get = options.get;
    this.set = options.set;
    this.cache = !!(options.cache ?? true);
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

  name: string;
  alive: boolean;
  dirty: boolean;
  prev: T;
  cache: boolean;
  private cachedVal: T;
  // eslint-disable-next-line no-use-before-define
  private hooks: Record<OBSERVER_HOOK, (obs: ObservableItem<T>) => any>;
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

  setHook(hook: OBSERVER_HOOK, cb: ObservableHookType<T>) {
    this.hooks[hook] = cb;
  }

  setDirty() {
    if (this.alive && !this.dirty) {
      this.dirty = true;
      trackerChanged(this, OBSERVER_SYMBOL);
      // store the previous value for the onChange
      this.prev = this.cachedVal;
      this.callHook(OBSERVER_HOOK.onImmediateChange);
      schedule(() => this.notifyChange());
    }
  }

  private notifyChange() {
    this.callHook(OBSERVER_HOOK.onChange);
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
    this.callHook(OBSERVER_HOOK.onGet);

    return val;
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

export default function Observer<T = any>(...args: Parameters<typeof ObservableItem.create<T>>) {
  return ObservableItem.create<T>(...args);
}
