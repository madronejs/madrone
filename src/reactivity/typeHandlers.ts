import Reactive from './Reactive';
import { KEYS_SYMBOL, dependTarget, targetChanged } from './global';

interface TypeHandlerOptions {
  options?: {
    name?: string;
    options?: Record<string, unknown>;
  };
  receiver?: any;
  target?: any;
  key?: string;
  value?: any;
  keysChanged?: boolean;
  valueChanged?: boolean;
}

// const wrap = (target, name, cb) => (...args) => {
//   const proto = Reflect.getPrototypeOf(target);
//   const method = proto[name];
//   const getValue = () => proto[name].call(target, ...args);

//   return cb({ getValue, proto, method, args });
// };
const makeOptions = (
  {
    options,
    target,
    key,
    receiver,
    value,
    keysChanged = false,
    valueChanged = false,
  } = {} as TypeHandlerOptions
) => ({
  options: options?.options || {},
  name: options?.name,
  target,
  key,
  receiver,
  value,
  keysChanged,
  valueChanged,
});

const optionGet = (options, target, key, receiver) => {
  dependTarget(target, key);
  options?.onGet?.(makeOptions({ options, target, key, receiver }));
};
const optionSet = (options, target, key, value) => {
  const curr = target[key];
  let valueChanged = false;
  let keysChanged = false;

  if (!(key in target)) {
    targetChanged(target, KEYS_SYMBOL);
    keysChanged = true;
  }

  if (curr !== value || Array.isArray(target)) {
    targetChanged(target, key);
    valueChanged = true;
  }

  if (keysChanged || valueChanged) {
    options?.onSet?.(makeOptions({ options, target, key, value, keysChanged, valueChanged }));
  }
};
const optionDelete = (options, target, key) => {
  targetChanged(target, key);
  targetChanged(target, KEYS_SYMBOL);
  options?.onDelete?.(makeOptions({ options, target, key, keysChanged: true }));
};
const optionHasOwnKeys = (options, target) => {
  // console.log('has own keys', target);
  dependTarget(target, KEYS_SYMBOL);
  options?.onHas?.(makeOptions({ options, target }));
};

const defaultHandlers = (options) => ({
  get: (target, prop, receiver) => {
    optionGet(options, target, prop, receiver);

    if (options?.deep && Object.getOwnPropertyDescriptor(target, prop)?.configurable) {
      return Reactive(Reflect.get(target, prop, receiver), options);
    }

    return Reflect.get(target, prop, receiver);
  },
  set: (...args) => {
    // @ts-ignore
    optionSet(options, ...args);
    // @ts-ignore
    return Reflect.set(...args);
  },
  deleteProperty: (...args) => {
    // @ts-ignore
    optionDelete(options, ...args);
    // @ts-ignore
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
});

const objectHandler = (options) => ({
  ...defaultHandlers(options),
});
const arrayHandler = (options) => ({
  ...defaultHandlers(options),
});

// const setHandler = (options) => ({
//   get: (target, key, receiver) => {
//     const proto = Reflect.getPrototypeOf(target);

//     if (key === 'has') {
//       return wrap(target, key, ({ getValue }) => {
//         const value = getValue();

//         dependTarget(target);
//         options?.onGet?.(makeOptions({ options, target, value }));

//         if (options?.deep) {
//           return Reactive(value, options);
//         }

//         return value;
//       });
//     }

//     if (['add', 'clear', 'delete'].includes(key)) {
//       const hookName = key === 'add' ? 'onSet' : 'onDelete';

//       return wrap(target, key, ({ getValue }) => {
//         const value = getValue();

//         targetChanged(target);
//         options?.[hookName]?.(makeOptions({ options, target, value }));

//         return value;
//       });
//     }

//     if (key === 'forEach') {
//       return wrap(target, key, ({ method, args }) => {
//         const [cb] = args;

//         dependTarget(target);

//         method.call(target, (val1, val2, theSet) => {
//           cb(
//             Reactive(val1, options),
//             Reactive(val2, options),
//             Reactive(theSet, options)
//           );
//         });
//       });
//     }

//     if (key in proto) {
//       return proto[key].bind(target);
//     }

//     return Reflect.get(target, key, receiver);
//   },
// });
// const mapHandler = (options) => {};
// const weaksetHandler = (options) => {};
// const weakmapHandler = (options) => {};

export default Object.freeze({
  object: objectHandler,
  array: arrayHandler,
  // set: setHandler,
  // map: mapHandler,
  // weakset: weaksetHandler,
  // weakmap: weakmapHandler,
});
