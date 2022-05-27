import { objectAccessed } from '@/global';

export default ({ reactive, computed, watch, toRaw } = {} as any) => {
  function describeComputed(name, config) {
    let getter;
    let setter;

    if (config.cache) {
      const cp = computed(config);

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

  function defineComputed(target, name, config) {
    Object.defineProperty(target, name, describeComputed(name, config));
  }

  function describeProperty(name, config) {
    const tg = { value: config.value };
    const atom = reactive(tg);

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

  function defineProperty(target, name, config) {
    Object.defineProperty(target, name, describeProperty(name, config));
  }

  return {
    toRaw,
    watch,
    describeProperty,
    defineProperty,
    describeComputed,
    defineComputed,
  };
};
