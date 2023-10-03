import { objectAccessed } from '@/global';
import { Integration, MadroneComputedDescriptor, MadronePropertyDescriptor } from '@/interfaces';
import { Computed, Reactive, Watcher, toRaw } from '@/reactivity';
import { ReactiveOptions } from '@/reactivity/interfaces';
import { ObservableHooksType } from '@/reactivity/Observer';

type MadroneStateOptions<T = any> = {
  reactive?: ReactiveOptions;
  computed?: ObservableHooksType<T>;
};

export function describeComputed<T = any>(
  name: string,
  config: MadroneComputedDescriptor,
  options?: MadroneStateOptions<T>
) {
  let getter;
  let setter;

  if (config.cache) {
    const cp = Computed<T>({
      ...config,
      get: config.get,
      name,
      onImmediateChange: options?.computed?.onImmediateChange,
      onChange: options?.computed?.onChange,
      onGet: options?.computed?.onGet,
      onSet: options?.computed?.onSet,
    });

    getter = function get() {
      objectAccessed(this);
      return cp.value;
    };
    setter = function set(val) {
      cp.value = val;
    };
  } else {
    getter = function get() {
      objectAccessed(this);
      return config.get.call(this);
    };
    setter = function set(...args) {
      config.set.call(this, ...args);
    };
  }

  return {
    enumerable: config.enumerable,
    configurable: config.configurable,
    get: getter,
    set: setter,
  };
}

export function describeProperty(
  name: string,
  config: MadronePropertyDescriptor,
  options?: MadroneStateOptions
) {
  const tg = { value: config.value };
  const atom = Reactive(tg, {
    name,
    onGet: options?.reactive?.onGet,
    onHas: options?.reactive?.onHas,
    onSet: options?.reactive?.onSet,
    onDelete: options?.reactive?.onDelete,
    needsProxy: options?.reactive?.needsProxy,
    deep: config.deep ?? options?.reactive?.deep,
  });

  return {
    configurable: config.configurable,
    enumerable: config.enumerable,
    get: function get() {
      objectAccessed(this);

      const { value: atomVal } = atom;

      if (Array.isArray(atomVal)) {
        // reactivity for arrays...
        Reflect.get(atomVal, 'length');
      }

      return atomVal;
    },
    set: function set(val) {
      atom.value = val;
    },
  };
}

export function defineComputed(target, name: string, config: MadroneComputedDescriptor, options) {
  Object.defineProperty(target, name, describeComputed(name, config, options));
}

export function defineProperty(target, name: string, config: MadronePropertyDescriptor, options?) {
  Object.defineProperty(target, name, describeProperty(name, config, options));
}

const MadroneState: Integration = {
  toRaw,
  watch: Watcher,
  describeProperty,
  defineProperty,
  describeComputed,
  defineComputed,
};

export default MadroneState;
export { Watcher as watch } from '@/reactivity';
