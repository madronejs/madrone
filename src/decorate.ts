/* eslint-disable @typescript-eslint/ban-types */
import { getIntegration } from '@/global';
import { applyClassMixins } from '@/util';
import { define } from '@/auto';
import { DecoratorOptionType, DecoratorDescriptorType } from './interfaces';

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

// ////////////////////////////
// COMPUTED
// ////////////////////////////

function computedIfNeeded(
  target: any,
  key: string,
  descriptor: PropertyDescriptor,
  options?: DecoratorOptionType
) {
  const pl = getIntegration();

  if (pl && !checkTargetObserved(target, key)) {
    define(target, key, {
      ...descriptor,
      get: descriptor.get.bind(target),
      set: descriptor.set?.bind(target),
      enumerable: true,
      ...options?.descriptors,
      cache: true,
    });
    setTargetObserved(target, key);
    return true;
  }

  return false;
}

function decorateComputed(
  target: any,
  key: string,
  descriptor: PropertyDescriptor,
  options?: DecoratorOptionType
) {
  if (typeof descriptor.get === 'function') {
    const newDescriptor = {
      ...descriptor,
      enumerable: true,
      configurable: true,
    };

    newDescriptor.get = function computedGetter() {
      computedIfNeeded(this, key, descriptor, options);
      return this[key];
    };

    newDescriptor.set = function computedSetter(val) {
      computedIfNeeded(this, key, descriptor, options);
      this[key] = val;
    };

    return newDescriptor;
  }

  return descriptor;
}

/**
 * Configure a getter property to be cached
 * @param target The target to add the computed property to
 * @param key The name of the computed property
 * @param descriptor property descriptors
 * @returns the modified property descriptors
 */
export function computed(target: any, key: string, descriptor: PropertyDescriptor) {
  return decorateComputed(target, key, descriptor);
}

computed.configure = function configureComputed(descriptorOverrides: DecoratorDescriptorType) {
  return (target: any, key: string, descriptor: PropertyDescriptor) =>
    decorateComputed(target, key, descriptor, { descriptors: descriptorOverrides });
};

// ////////////////////////////
// REACTIVE
// ////////////////////////////

function reactiveIfNeeded(target: any, key: string, options?: DecoratorOptionType) {
  const pl = getIntegration();

  if (pl && !checkTargetObserved(target, key)) {
    setTargetObserved(target, key);
    define(target, key, {
      ...Object.getOwnPropertyDescriptor(target, key),
      enumerable: true,
      ...options?.descriptors,
    });
    return true;
  }

  return false;
}

function decorateReactive(target: any, key: string, options?: DecoratorOptionType) {
  if (typeof target === 'function') {
    // handle the static case
    reactiveIfNeeded(target, key);
  } else {
    // handle the prototype case
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: true,
      get() {
        if (reactiveIfNeeded(this, key, options)) {
          return this[key];
        }

        return undefined;
      },
      set(val) {
        if (reactiveIfNeeded(this, key, options)) {
          this[key] = val;
        }
      },
    });
  }
}

interface reactive extends Function {
  /** Create a shallow reactive property */
  shallow: (target: any, key: string) => ReturnType<typeof decorateReactive>;
  /** Configure the descriptors for a property */
  configure: (
    overrides: DecoratorDescriptorType
  ) => (target: any, key: string) => ReturnType<typeof decorateReactive>;
}

/**
 * Configure a reactive property
 * @param target The target to add the reactive property to
 * @param key The name of the reactive property
 */
export function reactive(target: any, key: string) {
  return decorateReactive(target, key);
}

reactive.shallow = function configureReactive(target: any, key: string) {
  return decorateReactive(target, key, { descriptors: { deep: false } });
};

reactive.configure = function configureReactive(descriptorOverrides: DecoratorDescriptorType) {
  return (target: any, key: string) =>
    decorateReactive(target, key, { descriptors: descriptorOverrides });
};
