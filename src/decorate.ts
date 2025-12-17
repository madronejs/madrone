import { getIntegration } from '@/global';
import { applyClassMixins } from '@/util';
import { define } from '@/auto';
import { DecoratorOptionType, DecoratorDescriptorType } from './interfaces';

type Constructor = new (...args: unknown[]) => object;

const itemMap = new WeakMap<object, Set<string>>();

export function classMixin(...mixins: Constructor[]) {
  return (target: Constructor) => {
    if (mixins?.length) {
      applyClassMixins(target, mixins);
    }
  };
}

function trackTargetIfNeeded(target: object): void {
  if (!itemMap.has(target)) {
    itemMap.set(target, new Set());
  }
}

function checkTargetObserved(target: object, key: string): boolean {
  trackTargetIfNeeded(target);

  return itemMap.get(target).has(key);
}

function setTargetObserved(target: object, key: string): void {
  trackTargetIfNeeded(target);
  itemMap.get(target).add(key);
}

// ////////////////////////////
// COMPUTED
// ////////////////////////////

function computedIfNeeded(
  target: object,
  key: string,
  descriptor: PropertyDescriptor,
  options?: DecoratorOptionType
): boolean {
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
  target: object,
  key: string,
  descriptor: PropertyDescriptor,
  options?: DecoratorOptionType
): PropertyDescriptor {
  if (typeof descriptor.get === 'function') {
    const newDescriptor: PropertyDescriptor = {
      ...descriptor,
      enumerable: true,
      configurable: true,
    };

    newDescriptor.get = function computedGetter(this: Record<string, unknown>) {
      computedIfNeeded(this, key, descriptor, options);

      return this[key];
    };

    newDescriptor.set = function computedSetter(this: Record<string, unknown>, val: unknown) {
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
export function computed(target: object, key: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  return decorateComputed(target, key, descriptor);
}

computed.configure = function configureComputed(descriptorOverrides: DecoratorDescriptorType) {
  return (target: object, key: string, descriptor: PropertyDescriptor) => decorateComputed(
    target,
    key,
    descriptor,
    { descriptors: descriptorOverrides }
  );
};

// ////////////////////////////
// REACTIVE
// ////////////////////////////

function reactiveIfNeeded(target: object, key: string, options?: DecoratorOptionType): boolean {
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

function decorateReactive(target: object, key: string, options?: DecoratorOptionType): void {
  if (typeof target === 'function') {
    // handle the static case
    reactiveIfNeeded(target, key);
  } else {
    // handle the prototype case
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: true,
      get(this: Record<string, unknown>) {
        if (reactiveIfNeeded(this, key, options)) {
          return this[key];
        }

        return undefined;
      },
      set(this: Record<string, unknown>, val: unknown) {
        if (reactiveIfNeeded(this, key, options)) {
          this[key] = val;
        }
      },
    });
  }
}

/**
 * Configure a reactive property
 * @param target The target to add the reactive property to
 * @param key The name of the reactive property
 */
export function reactive(target: object, key: string): void {
  return decorateReactive(target, key);
}

reactive.shallow = function configureReactive(target: object, key: string): void {
  return decorateReactive(target, key, { descriptors: { deep: false } });
};

reactive.configure = function configureReactive(descriptorOverrides: DecoratorDescriptorType) {
  return (target: object, key: string) => decorateReactive(target, key, { descriptors: descriptorOverrides });
};
