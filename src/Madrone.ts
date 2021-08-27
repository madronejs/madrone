import { getDefaultDescriptors } from './util';

type DefinePropertyType = {
  value?: any;
  get?: () => any;
  set?: (any) => void;
  cache?: boolean;
  enumerable?: boolean;
  configurable?: boolean;
};
type WatchHandlerType = (val: any, old: any) => void;

const MadronePrototype = {
  $options: undefined,
  /** Hook into the initialization process */
  $init: undefined as (...any) => any,
  /**
   * The application this node is a part of
   * @deprecated
   */
  $app: undefined,
  /** Hold other model definitions for ease of use */
  $models: undefined,
  /** The data properties that have been added */
  get $dataKeys() {
    return Array.from(this.$dataSet);
  },
  /** @deprecated */
  $createNode(madroneModel, data, options) {
    let newModel = madroneModel;

    if (typeof madroneModel === 'string' && this.$models[madroneModel]) {
      newModel = this.$models[madroneModel];
    }

    return newModel?.create?.(data, {
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
  $watch(path: string, cb: WatchHandlerType | { deep: boolean; handler: WatchHandlerType }) {
    let options;

    if (typeof cb === 'function') {
      options = {};
      options.handler = cb.bind(this);
      options.deep = false;
    } else {
      options = cb;
    }

    return this.$state?.watch(path, options);
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
      configurable = true,
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

export type MadroneType = typeof MadronePrototype;
export const MadronePrototypeDescriptors = getDefaultDescriptors(MadronePrototype);
