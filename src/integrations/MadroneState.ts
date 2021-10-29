import lodashGet from 'lodash/get';
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

export function defineComputed(target, name, config, options) {
  Object.defineProperty(target, name, describeComputed(name, config, options));
}

export function defineProperty(target, name, config, options) {
  Object.defineProperty(target, name, describeProperty(name, config, options));
}

export function watchItem(target, path, handlerOrOptions) {
  let handler;
  let deep = false;

  if (typeof handlerOrOptions === 'function') {
    handler = handlerOrOptions;
  } else {
    deep = handlerOrOptions?.deep ?? deep;
    handler = handlerOrOptions?.handler;
  }

  return Watcher(() => lodashGet(target, path), handler, { deep });
}

export { Watcher as watch };

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
    return defineComputed(this.ctx, name, config, this.options);
  },

  defineProperty(name, config) {
    return defineProperty(this.ctx, name, config, this.options);
  },

  watch(path, options) {
    return watchItem(this.ctx, path, options);
  },
};

export default {
  integrate: MadroneStateIntegration.create,
  watch: Watcher,
  describeProperty,
  defineProperty,
  describeComputed,
  defineComputed,
};
