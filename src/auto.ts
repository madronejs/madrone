import { getIntegration } from '@/global';
import { MadroneDescriptor, WatcherOptions } from '@/interfaces';

export function define<T extends object>(obj: T, key: string, descriptor: MadroneDescriptor) {
  const pl = getIntegration();

  if (!pl) {
    throw new Error('No integration specified');
  }

  if (typeof descriptor.get === 'function' && pl?.defineComputed) {
    pl.defineComputed(obj, key, {
      get: descriptor.get.bind(obj),
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
      deep: descriptor.deep,
    });
  }
}

export function auto<T extends object>(
  obj: T,
  objDescriptors?: { [K in keyof T]?: MadroneDescriptor }
) {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const getDesc = (name: string, descName: keyof MadroneDescriptor) =>
    objDescriptors?.[name]?.[descName];

  for (const [key, descriptor] of Object.entries(descriptors)) {
    define(obj, key, {
      get: descriptor.get?.bind(obj),
      set: descriptor.set?.bind(obj),
      value: getDesc(key, 'value') ?? descriptor.value,
      enumerable: getDesc(key, 'enumerable') ?? descriptor.enumerable,
      configurable: getDesc(key, 'configurable') ?? descriptor.configurable,
      cache: getDesc(key, 'cache') ?? true,
      deep: getDesc(key, 'deep') ?? true,
    });
  }

  return obj as T;
}

export function watch<T>(
  scope: () => T,
  handler: (val: T, old: T) => any,
  options?: WatcherOptions
) {
  const pl = getIntegration();

  return pl?.watch?.(scope, handler, options);
}
