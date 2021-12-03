type OptionalPropertyNames<T> = {
  [K in keyof T]-?: any extends { [P in K]: T[K] } ? K : never;
}[keyof T];

type SpreadProperties<L, R, K extends keyof L & keyof R> = {
  [P in K]: L[P] | Exclude<R[P], undefined>;
};

type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

export type SpreadTwo<L, R> = Id<
  Pick<L, Exclude<keyof L, keyof R>> &
    Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>> &
    Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>> &
    SpreadProperties<L, R, OptionalPropertyNames<R> & keyof L>
>;

export type Spread<A extends readonly [...any]> = A extends [infer L, ...infer R]
  ? SpreadTwo<L extends (...any) => any ? ReturnType<L> : L, Spread<R>>
  : unknown;

/**
 * Merge multiple object definitions into a single new object definition
 * @param types
 * @returns The new object definition
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function merge<A extends object[]>(...types: [...A]) {
  const defs = {} as PropertyDescriptorMap;
  const newVal = {};

  types.forEach((type) => {
    // @ts-ignore
    const theType = typeof type === 'function' ? type() : type;

    Object.assign(defs, Object.getOwnPropertyDescriptors(theType ?? type ?? {}));
  });
  Object.defineProperties(newVal, defs);

  return newVal as Spread<A>;
}

/**
 * Extend the prototype of a base class with the prototypes of other classes. Mutates the base class.
 * @param base Base class that the mixins will be mixed into. Any naming conflicts will prefer this base class.
 * @param constructors List of mixin classes that will be applied to the base class.
 */
export function applyClassMixins(base: any, mixins: [...any]) {
  Object.defineProperties(
    base.prototype,
    Object.getOwnPropertyDescriptors(merge(...mixins.concat(base).map((item) => item.prototype)))
  );
}

export function getDefaultDescriptors(obj, defaults?) {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const newDefaults = {
    configurable: true,
    enumerable: false,
    ...(defaults || {}),
  };

  Object.keys(descriptors).forEach((key) => {
    Object.entries(newDefaults).forEach(([descKey, descValue]) => {
      descriptors[key][descKey] = descValue;
    });
  });

  return descriptors;
}

export function toFlatObject(toMix) {
  const base = {};

  for (let i = 0; i < toMix.length; i += 1) {
    const baseMix = toMix[i];

    if (baseMix && typeof baseMix === 'object') {
      Object.assign(base, baseMix);
    }
  }

  return base;
}

export function toFunctionArray(toMix) {
  const endData = [];

  for (let i = 0; i < toMix.length; i += 1) {
    const baseMix = toMix[i];

    if (typeof baseMix === 'function') {
      endData.push(baseMix);
    } else if (Array.isArray(baseMix)) {
      endData.push(...baseMix);
    } else if (baseMix && typeof baseMix === 'object') {
      endData.push(() => baseMix);
    } else {
      endData.push(undefined);
    }
  }

  return endData.flat();
}

export function flattenOptions(options) {
  const flatItem = {};
  const optionArray = [].concat(options || []).filter((item) => !!item);

  optionArray.forEach((item) => {
    if (item && typeof item === 'object') {
      Object.entries(item).forEach(([key, val]) => {
        if (!flatItem[key]) {
          flatItem[key] = [];
        }

        if (val !== undefined) {
          flatItem[key].push(val);
        }
      });
    }
  });

  return flatItem;
}
