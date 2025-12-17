import Reactive from './Reactive';
import { KEYS_SYMBOL, dependTarget, targetChanged } from './global';
import { TypeHandlerOptions, ReactiveOptions } from './interfaces';

const makeOptions = (handlerOptions: TypeHandlerOptions) => {
  const {
    name,
    target,
    key,
    receiver,
    value,
    keysChanged = false,
    valueChanged = false,
  } = handlerOptions;

  return {
    name,
    target,
    key,
    receiver,
    value,
    keysChanged,
    valueChanged,
  };
};

const optionGet = (options: ReactiveOptions, target, key, receiver) => {
  dependTarget(target, key);
  options?.onGet?.(
    makeOptions({
      name: options.name,
      target,
      key,
      receiver,
    })
  );
};
const optionSet = (options: ReactiveOptions, target, key, value) => {
  const curr = target[key];
  const isArray = Array.isArray(target);
  let valueChanged = false;
  let keysChanged = false;

  if (!(key in target)) {
    targetChanged(target, KEYS_SYMBOL);
    keysChanged = true;

    if (isArray) {
      targetChanged(target, 'length');
    }
  }

  if (curr !== value || isArray) {
    targetChanged(target, key);
    valueChanged = true;
  }

  if (keysChanged || valueChanged) {
    options?.onSet?.(
      makeOptions({
        name: options.name,
        target,
        key,
        value,
        keysChanged,
        valueChanged,
      })
    );
  }
};
const optionDelete = (options: ReactiveOptions, target, key) => {
  targetChanged(target, key);
  targetChanged(target, KEYS_SYMBOL);
  options?.onDelete?.(
    makeOptions({
      name: options.name,
      target,
      key,
      keysChanged: true,
    })
  );
};
const optionHasOwnKeys = (options: ReactiveOptions, target, key?) => {
  dependTarget(target, KEYS_SYMBOL);
  options?.onHas?.(
    makeOptions({
      name: options.name,
      target,
      key,
    })
  );
};

function defaultHandlers(options: ReactiveOptions) {
  const needsProxy = options.needsProxy || (() => true);

  return {
    get: (target, prop, receiver) => {
      optionGet(options, target, prop, receiver);

      const value = Reflect.get(target, prop, receiver);

      if (
        needsProxy({ target, key: prop, value })
        && options?.deep
        && Object.getOwnPropertyDescriptor(target, prop)?.configurable
      ) {
        return Reactive(value, options);
      }

      return value;
    },
    set: (target: object, propertyKey: PropertyKey, value: any) => {
      optionSet(options, target, propertyKey, value);
      return Reflect.set(target, propertyKey, value);
    },
    deleteProperty: (...args: Parameters<typeof Reflect.deleteProperty>) => {
      optionDelete(options, ...args);
      return Reflect.deleteProperty(...args);
    },
    has: (target, key) => {
      optionHasOwnKeys(options, target);
      return Reflect.has(target, key);
    },
    ownKeys: (target) => {
      optionHasOwnKeys(options, target);
      return Reflect.ownKeys(target);
    },
    getPrototypeOf: (target) => Object.getPrototypeOf(target),
  };
}

const objectHandler = (options) => ({
  ...defaultHandlers(options),
});
const arrayHandler = (options) => ({
  ...defaultHandlers(options),
});

/**
 * Wraps a value in a Reactive proxy if deep mode is enabled and the value is an object
 */
const wrapIfDeep = <T>(value: T, options: ReactiveOptions): T => {
  if (options?.deep && value && typeof value === 'object') {
    return Reactive(value, options);
  }
  return value;
};

/**
 * Creates a reactive iterator that wraps yielded values
 */
function *reactiveIterator<T>(
  iterator: IterableIterator<T>,
  options: ReactiveOptions,
  wrapValue: (val: T) => T
): IterableIterator<T> {
  for (const item of iterator) {
    yield wrapValue(item);
  }
}

const setHandler = (options: ReactiveOptions) => ({
  get: (target: Set<any>, key: PropertyKey, receiver: any) => {
    // Handle size property
    if (key === 'size') {
      dependTarget(target, KEYS_SYMBOL);
      options?.onGet?.(makeOptions({
        name: options.name,
        target,
        key,
      }));

      return target.size;
    }

    // Handle has - tracks dependency on the specific value
    if (key === 'has') {
      return (value: any) => {
        dependTarget(target, KEYS_SYMBOL);
        options?.onGet?.(makeOptions({
          name: options.name,
          target,
          key,
          value,
        }));

        return target.has(value);
      };
    }

    // Handle add - triggers change
    if (key === 'add') {
      return (value: any) => {
        const hadValue = target.has(value);

        target.add(value);

        if (!hadValue) {
          targetChanged(target, KEYS_SYMBOL);
          options?.onSet?.(makeOptions({
            name: options.name,
            target,
            key,
            value,
            keysChanged: true,
          }));
        }

        return receiver; // Return proxy for chaining
      };
    }

    // Handle delete - triggers change
    if (key === 'delete') {
      return (value: any) => {
        const hadValue = target.has(value);
        const deleted = target.delete(value);

        if (hadValue) {
          targetChanged(target, KEYS_SYMBOL);
          options?.onDelete?.(makeOptions({
            name: options.name,
            target,
            key,
            value,
            keysChanged: true,
          }));
        }

        return deleted;
      };
    }

    // Handle clear - triggers change
    if (key === 'clear') {
      return () => {
        const hadValues = target.size > 0;

        target.clear();

        if (hadValues) {
          targetChanged(target, KEYS_SYMBOL);
          options?.onDelete?.(makeOptions({
            name: options.name,
            target,
            key,
            keysChanged: true,
          }));
        }
      };
    }

    // Handle forEach - tracks dependency, wraps values
    if (key === 'forEach') {
      return (cb: (value: any, key: any, set: Set<any>) => void, thisArg?: any) => {
        dependTarget(target, KEYS_SYMBOL);
        options?.onGet?.(makeOptions({
          name: options.name,
          target,
          key,
        }));

        for (const [val1, val2] of target.entries()) {
          cb.call(thisArg, wrapIfDeep(val1, options), wrapIfDeep(val2, options), receiver);
        }
      };
    }

    // Handle values/keys (they're the same for Set)
    if (key === 'values' || key === 'keys') {
      return () => {
        dependTarget(target, KEYS_SYMBOL);
        options?.onGet?.(makeOptions({
          name: options.name,
          target,
          key,
        }));

        return reactiveIterator(target.values(), options, (v) => wrapIfDeep(v, options));
      };
    }

    // Handle entries
    if (key === 'entries') {
      return () => {
        dependTarget(target, KEYS_SYMBOL);
        options?.onGet?.(makeOptions({
          name: options.name,
          target,
          key,
        }));

        return reactiveIterator(
          target.entries(),
          options,
          ([v1, v2]) => [wrapIfDeep(v1, options), wrapIfDeep(v2, options)] as [any, any]
        );
      };
    }

    // Handle Symbol.iterator
    if (key === Symbol.iterator) {
      return () => {
        dependTarget(target, KEYS_SYMBOL);
        options?.onGet?.(makeOptions({
          name: options.name,
          target,
          key,
        }));

        return reactiveIterator(target[Symbol.iterator](), options, (v) => wrapIfDeep(v, options));
      };
    }

    // Handle Symbol.toStringTag
    if (key === Symbol.toStringTag) {
      return 'Set';
    }

    return Reflect.get(target, key, receiver);
  },
});

const mapHandler = (options: ReactiveOptions) => ({
  get: (target: Map<any, any>, key: PropertyKey, receiver: any) => {
    // Handle size property
    if (key === 'size') {
      dependTarget(target, KEYS_SYMBOL);
      options?.onGet?.(makeOptions({
        name: options.name,
        target,
        key,
      }));

      return target.size;
    }

    // Handle has - tracks dependency on the key
    if (key === 'has') {
      return (mapKey: any) => {
        dependTarget(target, mapKey);
        options?.onGet?.(makeOptions({
          name: options.name,
          target,
          key: mapKey,
        }));

        return target.has(mapKey);
      };
    }

    // Handle get - tracks dependency on the key
    if (key === 'get') {
      return (mapKey: any) => {
        dependTarget(target, mapKey);
        options?.onGet?.(makeOptions({
          name: options.name,
          target,
          key: mapKey,
        }));

        return wrapIfDeep(target.get(mapKey), options);
      };
    }

    // Handle set - triggers change
    if (key === 'set') {
      return (mapKey: any, value: any) => {
        const hadKey = target.has(mapKey);
        const oldValue = target.get(mapKey);

        target.set(mapKey, value);

        if (!hadKey) {
          targetChanged(target, KEYS_SYMBOL);
        }

        if (!hadKey || oldValue !== value) {
          targetChanged(target, mapKey);
          options?.onSet?.(makeOptions({
            name: options.name,
            target,
            key: mapKey,
            value,
            keysChanged: !hadKey,
            valueChanged: oldValue !== value,
          }));
        }

        return receiver; // Return proxy for chaining
      };
    }

    // Handle delete - triggers change
    if (key === 'delete') {
      return (mapKey: any) => {
        const hadKey = target.has(mapKey);
        const deleted = target.delete(mapKey);

        if (hadKey) {
          targetChanged(target, KEYS_SYMBOL);
          targetChanged(target, mapKey);
          options?.onDelete?.(makeOptions({
            name: options.name,
            target,
            key: mapKey,
            keysChanged: true,
          }));
        }

        return deleted;
      };
    }

    // Handle clear - triggers change
    if (key === 'clear') {
      return () => {
        const keys = [...target.keys()];
        const hadValues = target.size > 0;

        target.clear();

        if (hadValues) {
          targetChanged(target, KEYS_SYMBOL);

          for (const k of keys) {
            targetChanged(target, k);
          }

          options?.onDelete?.(makeOptions({
            name: options.name,
            target,
            key,
            keysChanged: true,
          }));
        }
      };
    }

    // Handle forEach - tracks dependency, wraps values
    if (key === 'forEach') {
      return (cb: (value: any, key: any, map: Map<any, any>) => void, thisArg?: any) => {
        dependTarget(target, KEYS_SYMBOL);
        options?.onGet?.(makeOptions({
          name: options.name,
          target,
          key,
        }));

        for (const [mapKey, value] of target.entries()) {
          cb.call(thisArg, wrapIfDeep(value, options), mapKey, receiver);
        }
      };
    }

    // Handle keys
    if (key === 'keys') {
      return () => {
        dependTarget(target, KEYS_SYMBOL);
        options?.onGet?.(makeOptions({
          name: options.name,
          target,
          key,
        }));

        return target.keys();
      };
    }

    // Handle values
    if (key === 'values') {
      return () => {
        dependTarget(target, KEYS_SYMBOL);
        options?.onGet?.(makeOptions({
          name: options.name,
          target,
          key,
        }));

        return reactiveIterator(target.values(), options, (v) => wrapIfDeep(v, options));
      };
    }

    // Handle entries
    if (key === 'entries') {
      return () => {
        dependTarget(target, KEYS_SYMBOL);
        options?.onGet?.(makeOptions({
          name: options.name,
          target,
          key,
        }));

        return reactiveIterator(
          target.entries(),
          options,
          ([k, v]) => [k, wrapIfDeep(v, options)] as [any, any]
        );
      };
    }

    // Handle Symbol.iterator
    if (key === Symbol.iterator) {
      return () => {
        dependTarget(target, KEYS_SYMBOL);
        options?.onGet?.(makeOptions({
          name: options.name,
          target,
          key,
        }));

        return reactiveIterator(
          target[Symbol.iterator](),
          options,
          ([k, v]) => [k, wrapIfDeep(v, options)] as [any, any]
        );
      };
    }

    // Handle Symbol.toStringTag
    if (key === Symbol.toStringTag) {
      return 'Map';
    }

    return Reflect.get(target, key, receiver);
  },
});

export default Object.freeze({
  object: objectHandler,
  array: arrayHandler,
  set: setHandler,
  map: mapHandler,
});
