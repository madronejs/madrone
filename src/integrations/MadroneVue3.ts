export default ({ reactive, computed, watch } = {} as any) => {
  function describeComputed(name, config) {
    let getter;
    let setter;

    if (config.cache) {
      const cp = computed(config);

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

  function defineComputed(target, name, config) {
    Object.defineProperty(target, name, describeComputed(name, config));
  }

  function describeProperty(name, config) {
    const tg = { value: config.value };
    const atom = reactive(tg);

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

  function defineProperty(target, name, config) {
    Object.defineProperty(target, name, describeProperty(name, config));
  }

  return {
    watch,
    describeProperty,
    defineProperty,
    describeComputed,
    defineComputed,
  };
};
