import { Computed, Reactive, Watcher } from '../reactivity';

export function describeComputed(name, config, options) {
  let getter;
  let setter;

  if (config.cache) {
    const cp = Computed({
      ...config,
      name,
      onImmediateChange: options?.computed?.onImmediateChange,
      onChange: options?.computed?.onChange,
      onGet: options?.computed?.onGet,
      onHas: options?.computed?.onHas,
      onSet: options?.computed?.onSet,
    });

    getter = () => cp.value;
    setter = (val) => {
      cp.value = val;
    };
  } else {
    getter = config.get;
    setter = config.set;
  }

  return {
    enumerable: config.enumerable,
    configurable: config.configurable,
    get: getter,
    set: setter,
  };
}

export function describeProperty(name, config, options) {
  const tg = { value: config.value };
  const atom = Reactive(tg, {
    name,
    onGet: options?.reactive?.onGet,
    onHas: options?.reactive?.onHas,
    onSet: options?.reactive?.onSet,
    onDelete: options?.reactive?.onDelete,
    options: { name, property: () => atom },
  });

  return {
    configurable: config.configurable,
    enumerable: config.enumerable,
    get: () => {
      const { value: atomVal } = atom;

      if (Array.isArray(atomVal)) {
        // reactivity for arrays...
        Reflect.get(atomVal, 'length');
      }

      return atomVal;
    },
    set: (val) => {
      atom.value = val;
    },
  };
}

export function defineComputed(target, name: string, config, options) {
  Object.defineProperty(target, name, describeComputed(name, config, options));
}

export function defineProperty(
  target,
  name: string,
  config: { value?: any; enumerable?: boolean; configurable?: boolean },
  options?
) {
  Object.defineProperty(target, name, describeProperty(name, config, options));
}

export { Watcher as watch };

export default {
  watch: Watcher,
  describeProperty,
  defineProperty,
  describeComputed,
  defineComputed,
};
