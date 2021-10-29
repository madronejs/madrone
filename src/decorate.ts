import { getIntegrations } from './global';

const itemMap: WeakMap<any, Set<string>> = new WeakMap();

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
  const [pl] = getIntegrations();

  if (pl && !checkTargetObserved(target, key)) {
    Object.defineProperty(
      target,
      key,
      pl?.describeComputed?.(key, {
        ...descriptor,
        get: descriptor.get.bind(target),
        cache: true,
      }) || descriptor
    );

    setTargetObserved(target, key);

    return true;
  }

  return false;
}

export function computed(target: any, key: string, descriptor: PropertyDescriptor) {
  if (typeof descriptor.get === 'function') {
    const newDescriptor = { ...descriptor, configurable: true };

    newDescriptor.get = function computedGetter() {
      computedIfNeeded(this, key, descriptor);

      return this[key];
    };

    return newDescriptor;
  }

  return descriptor;
}

function reactiveIfNeeded(target: any, key: string, value?: any) {
  const [pl] = getIntegrations();

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
