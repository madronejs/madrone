import Model from './Model';
import { getDefaultDescriptors, toArrayPath } from './util';

type DefinePropertyType = { value?: any, get?: () => any, set?: (any) => void, cache?: Boolean, enumerable?: Boolean, configurable?: Boolean };

function Madrone() {}
Madrone.Model = Model;
/**
 * Check if an object is Madrone
 * @param instance the instance to check
 * @returns if the given object is a Madrone instance or not
 */
Madrone.isMadrone = (instance) => !!instance?.$isMadrone;

const proto = {
  /** @private */
  $isMadrone: true,
  $options: undefined,
  $init: undefined as (...any) => any,
  $root: undefined,
  /** The application this node is a part of */
  $app: undefined,
  /** Compiled type */
  $type: undefined,
  /** Model definition for this type */
  $model: undefined as typeof Model,
  /** @deprecated */
  $models: undefined as object,
  $dataSet: undefined as typeof Set,
  get $dataKeys() {
    return Array.from(this.$dataSet);
  },
  $createNode(model, data, options) {
    return Madrone.create({
      type: model?.type,
      model,
      data,
      app: this.$app,
      root: this.$root,
      parent: this,
      options,
    });
  },
  /**
   * Watch a property for changes
   * @param path the path of the property to watch
   * @param cb the callback function called when a change occurs or options object
   * @returns {Function|void} a disposer function
   */
  $watch(path: string, cb: Function|object) {
    let options;

    if (typeof cb === 'function') {
      options = {};
      options.handler = cb.bind(this);
      options.deep = false;
    } else {
      options = cb;
    }

    return this.$state?.watch(toArrayPath(path), options);
  },
  /**
   * Define a property on the object
   * @private
   * @param name the name of the property to define
   * @param options.get the getter method
   * @param options.set the setter method
   * @param options.cache whether or not to cache the property
   * @returns {void}
   */
  $defineProperty(
    name: string,
    {
      value,
      get,
      set,
      cache = true,
      enumerable = true,
      configurable = true
    } = {} as DefinePropertyType
  ) {
    if (typeof get === 'function' && this.$state?.defineComputed) {
      this.$state.defineComputed(name, { get: get.bind(this), set: set?.bind(this), cache });
    } else if (this.$state?.defineProperty) {
      this.$state.defineProperty(name, value);
      this.$dataSet.add(name);
    } else {
      const descriptor = { enumerable, configurable } as PropertyDescriptor;

      if (typeof set === 'function') descriptor.set = set;

      if (typeof get === 'function') {
        descriptor.get = get;
      } else {
        descriptor.value = value;
        descriptor.writable = true;
      }

      Object.defineProperty(this, name, descriptor);
    }
  },
};

export type MadroneType = typeof proto;
const protoDescriptors = getDefaultDescriptors(proto);

Madrone.create = function create<T extends object>({
  model = null,
  data = null,
  options = {},
  app = null,
  root = null,
  parent = null,
  type = null,
  install,
} = {} as {
  type?: T,
  model: object,
  data?: object,
  options?: object,
  app?: object,
  root?: object,
  parent?: object,
  install?: Function,
}) {
  let ctx = {} as typeof proto;

  Object.defineProperties(ctx, {
    ...protoDescriptors,
    ...getDefaultDescriptors({
      $parent: parent,
      $options: options,
      $model: model,
      $type: type,
      $models: {},
      $dataSet: new Set(),
      get $root() {
        return root || parent || ctx;
      },
      get $app() {
        return app || ctx.$root;
      }
    })
  });

  install?.(ctx);

  if (typeof ctx.$init === 'function') {
    ctx = ctx.$init(data) || ctx;
  } else if (data && typeof data === 'object') {
    Object.assign(ctx, data);
  }

  return ctx as T & typeof proto;
}

export default Madrone;
