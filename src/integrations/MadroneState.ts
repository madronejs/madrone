import { objectAccessed } from '@/global';
import {
  Integration,
  IntegrationOptions,
  MadroneComputedDescriptor,
  MadronePropertyDescriptor,
} from '@/interfaces';
import {
  Computed, Reactive, Watcher, toRaw,
} from '@/reactivity';
import { ReactiveOptions } from '@/reactivity/interfaces';
import { ObservableHooksType } from '@/reactivity/Observer';

export type MadroneStateOptions<T = unknown> = {
  reactive?: ReactiveOptions,
  computed?: ObservableHooksType<T>,
};

export function describeComputed<T = unknown>(
  name: string,
  config: MadroneComputedDescriptor,
  options?: MadroneStateOptions<T>
): PropertyDescriptor {
  let getter: () => T;
  let setter: (val: T) => void;

  if (config.cache) {
    const cp = Computed<T>({
      ...config,
      get: config.get as () => T,
      name,
      onImmediateChange: options?.computed?.onImmediateChange,
      onChange: options?.computed?.onChange,
      onGet: options?.computed?.onGet,
      onSet: options?.computed?.onSet,
    });

    getter = function get(this: object) {
      objectAccessed(this);

      return cp.value;
    };
    setter = function set(val: T) {
      cp.value = val;
    };
  } else {
    getter = function get(this: object) {
      objectAccessed(this);

      return config.get.call(this);
    };
    setter = function set(this: object, ...args: [T]) {
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
): PropertyDescriptor {
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
    get: function get(this: object) {
      objectAccessed(this);

      const { value: atomVal } = atom;

      if (Array.isArray(atomVal)) {
        // reactivity for arrays...
        Reflect.get(atomVal, 'length');
      }

      return atomVal;
    },
    set: function set(val: unknown) {
      atom.value = val;
    },
  };
}

export function defineComputed(
  target: object,
  name: string,
  config: MadroneComputedDescriptor,
  options?: IntegrationOptions
): void {
  Object.defineProperty(target, name, describeComputed(name, config, options as MadroneStateOptions));
}

export function defineProperty(
  target: object,
  name: string,
  config: MadronePropertyDescriptor,
  options?: IntegrationOptions
): void {
  Object.defineProperty(target, name, describeProperty(name, config, options as MadroneStateOptions));
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
