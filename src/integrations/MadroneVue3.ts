import lodashGet from 'lodash/get';

export default ({ reactive, computed, watch } = {} as any) => {
  return {
    integrate: (ctx) => ({
      ctx,
      defineComputed(name, config) {
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

        Object.defineProperty(this.ctx, name, {
          enumerable: true,
          configurable: true,
          get: getter,
          set: setter,
        });
      },

      defineProperty(name, value) {
        const target = { value };
        const atom = reactive(target);

        Object.defineProperty(this.ctx, name, {
          enumerable: true,
          configurable: true,
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
        });
      },

      watch(path, { handler = undefined, deep = false } = {}) {
        return watch(() => lodashGet(this.ctx, path), handler, { deep });
      }
    }),
  };
}
