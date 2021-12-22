import { getIntegration } from './global';
import { MadroneDescriptor } from './interfaces/Integration';

export function define<T>(obj: T, key: string, descriptor: MadroneDescriptor) {
  const pl = getIntegration();

  if (!pl) {
    throw new Error('No integration specified');
  }

  if (typeof descriptor.get === 'function' && pl?.defineComputed) {
    pl.defineComputed(obj, key, {
      get: descriptor.get?.bind(obj),
      set: descriptor.set?.bind(obj),
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable,
      cache: descriptor.cache ?? true,
    });
  } else if (!descriptor.get && pl?.defineProperty) {
    pl.defineProperty(obj, key, {
      value: descriptor.value,
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable,
    });
  }
}

export function auto<T>(obj: T, objDescriptors?: { [K in keyof T]: MadroneDescriptor }) {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const getDesc = (name, descName) => objDescriptors?.[name]?.[descName];

  Object.entries(descriptors).forEach(([key, descriptor]) => {
    define(obj, key, {
      get: descriptor.get?.bind(obj),
      set: descriptor.set?.bind(obj),
      enumerable: getDesc(key, 'enumerable') ?? descriptor.enumerable,
      configurable: getDesc(key, 'configurable') ?? descriptor.configurable,
      cache: getDesc(key, 'cache') ?? true,
    });
  });

  return obj as T;
}

export function watch(scope, handler, options?: { deep?: boolean }) {
  const pl = getIntegration();

  return pl?.watch?.(scope, handler, options);
}
