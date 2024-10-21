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
export function merge<A extends (object | ((...any) => any))[]>(...types: [...A]) {
  const defs = {} as PropertyDescriptorMap;
  const newVal = {};

  for (const type of types) {
    const theType = typeof type === 'function' ? type() : type;

    Object.assign(defs, Object.getOwnPropertyDescriptors(theType ?? type ?? {}));
  }

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
    Object.getOwnPropertyDescriptors(merge(...[...mixins, base].map((item) => item.prototype)))
  );
}

export function getDefaultDescriptors(obj, defaults?) {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const newDefaults = { configurable: true, enumerable: false, ...defaults };

  for (const key of Object.keys(descriptors)) {
    for (const [descKey, descValue] of Object.entries(newDefaults)) {
      descriptors[key][descKey] = descValue;
    }
  }

  return descriptors;
}
