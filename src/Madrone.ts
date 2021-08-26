import { getDefaultDescriptors, toArrayPath } from './util';

type DefinePropertyType = { value?: any, get?: () => any, set?: (any) => void, cache?: Boolean, enumerable?: Boolean, configurable?: Boolean };

const proto = {
  $options: undefined,
  /** Hook into the initialization process */
  $init: undefined as (...any) => any,
  /**
   * The application this node is a part of
   * @deprecated
   */
  $app: undefined,
  /** The data properties that have been added */
  get $dataKeys() {
    return Array.from(this.$dataSet);
  },
  /** @deprecated */
  $createNode(madroneModel, data, options) {
    return madroneModel?.create?.(data, {
      app: this.$app,
      root: this.$root,
      parent: this,
      ...(options || {}),
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
        this.$dataSet.add(name);
      }

      Object.defineProperty(this, name, descriptor);
    }
  },
};

export type MadroneType = typeof proto;
const protoDescriptors = getDefaultDescriptors(proto);

export function makeMadrone<T extends object>({
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
  options?: any,
  app?: object,
  root?: object,
  parent?: object,
  install?: Function,
}) {
  let ctx = {} as typeof proto;

  Object.defineProperties(ctx, {
    ...protoDescriptors,
    ...getDefaultDescriptors({
      $state: undefined,
      $isMadrone: true,
      $parent: parent,
      $options: options,
      $model: model,
      $type: type,
      $dataSet: new Set(),
      get $root() {
        return root || parent || ctx;
      },
      get $app() {
        // @ts-ignore
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

  // call created hook
  if (Array.isArray(options.created)) {
    options.created.forEach((cb) => cb?.call(ctx));
  }

  return ctx as T & typeof proto;
}