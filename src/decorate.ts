/* eslint-disable @typescript-eslint/ban-types */
import { getIntegration } from './global';
import { applyClassMixins } from './util';

const itemMap: WeakMap<any, Set<string>> = new WeakMap();

export function classMixin(...mixins: Array<Function>) {
  return (target: Function) => {
    if (mixins?.length) {
      applyClassMixins(target, mixins);
    }
  };
}

function trackTargetIfNeeded(target) {
  if (!itemMap.has(target)) {
    itemMap.set(target, new Set());
  }
}

function checkTargetObserved(target, key) {
  trackTargetIfNeeded(target);
  return itemMap.get(target).has(key);
}

function setTargetObserved(target, key) {
  trackTargetIfNeeded(target);
  itemMap.get(target).add(key);
}

function computedIfNeeded(target: any, key: string, descriptor: PropertyDescriptor) {
  const pl = getIntegration();

  if (pl && !checkTargetObserved(target, key)) {
    Object.defineProperty(
      target,
      key,
      pl?.describeComputed?.(key, {
        ...descriptor,
        get: descriptor.get.bind(target),
        set: descriptor.set?.bind(target),
        enumerable: true,
        cache: true,
      }) || descriptor
    );

    setTargetObserved(target, key);
    return true;
  }

  return false;
}

/**
 * Configure a getter property to be cached
 * @param target The target to add the computed property to
 * @param key The name of the computed property
 * @param descriptor property descriptors
 * @returns the modified property descriptors
 */
export function computed(target: any, key: string, descriptor: PropertyDescriptor) {
  if (typeof descriptor.get === 'function') {
    const newDescriptor = { ...descriptor, enumerable: true, configurable: true };

    newDescriptor.get = function computedGetter() {
      computedIfNeeded(this, key, descriptor);
      return this[key];
    };

    newDescriptor.set = function computedSetter(val) {
      computedIfNeeded(this, key, descriptor);
      this[key] = val;
    };

    return newDescriptor;
  }

  return descriptor;
}

function reactiveIfNeeded(target: any, key: string, value?: any) {
  const pl = getIntegration();

  if (pl && !checkTargetObserved(target, key)) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    const modified = pl?.describeProperty?.(key, {
      ...descriptor,
      enumerable: true,
      value,
    });

    Object.defineProperty(target, key, modified || descriptor);
    setTargetObserved(target, key);
    return true;
  }

  return false;
}

/**
 * Configure a reactive property
 * @param target The target to add the reactive property to
 * @param key The name of the reactive property
 */
export function reactive(target: any, key: string) {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    get() {
      reactiveIfNeeded(this, key);
      return this[key];
    },
    set(val) {
      reactiveIfNeeded(this, key);
      this[key] = val;
    },
  });
}
