import lodashGet from 'lodash/get';
import { Computed, Reactive, Watcher } from '../reactivity';

export function MadroneStateIntegration(ctx, options) {
  this.init(ctx, options);
}

/**
 * Create a new MadroneStateIntegration instance
 * @param {Object} ctx the context to observe
 * @param {Object} [options] the observe options
 * @param {Object} [options.computed] the computed options
 * @param {Object} [options.reactive] the reactive options
 * @returns {MadroneStateIntegration} the created MadroneStateIntegration
 */
MadroneStateIntegration.create = (ctx, options) => new MadroneStateIntegration(ctx, options);

MadroneStateIntegration.prototype = {
  init(ctx, options) {
    this.ctx = ctx;
    this.options = options || {};
    this.defineComputed = this.defineComputed.bind(this);
    this.defineProperty = this.defineProperty.bind(this);
    this.watch = this.watch.bind(this);
  },

  defineComputed(name, config) {
    let getter;
    let setter;

    if (config.cache) {
      const cp = Computed({
        ...config,
        name,
        onImmediateChange: this.options.computed?.onImmediateChange,
        onChange: this.options.computed?.onChange,
        onGet: this.options.computed?.onGet,
        onHas: this.options.computed?.onHas,
        onSet: this.options.computed?.onSet,
      });

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
    const atom = Reactive(target, {
      name,
      onGet: this.options.reactive?.onGet,
      onHas: this.options.reactive?.onHas,
      onSet: this.options.reactive?.onSet,
      onDelete: this.options.reactive?.onDelete,
      options: { name, property: () => atom },
    });

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
    return Watcher(() => lodashGet(this.ctx, path), handler, { deep });
  },
};

export default {
  integrate: MadroneStateIntegration.create,
};
