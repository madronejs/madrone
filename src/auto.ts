import { getIntegration } from './global';
import { MadroneDescriptor } from './interfaces/Integration';

export function auto<T>(obj: T, objDescriptors?: { [K in keyof T]: MadroneDescriptor }) {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const pl = getIntegration();
  const getDesc = (name, descName) => objDescriptors?.[name]?.[descName];

  Object.entries(descriptors).forEach(([key, descriptor]) => {
    if (typeof descriptor.get === 'function' && pl?.defineComputed) {
      pl.defineComputed(obj, key, {
        get: descriptor.get?.bind(obj),
        set: descriptor.set?.bind(obj),
        enumerable: getDesc(key, 'enumerable') ?? descriptor.enumerable,
        configurable: getDesc(key, 'configurable') ?? descriptor.configurable,
        cache: getDesc(key, 'cache') ?? true,
      });
    } else if (!descriptor.get && pl?.defineProperty) {
      pl.defineProperty(obj, key, {
        value: getDesc(key, 'value') ?? descriptor.value,
        enumerable: getDesc(key, 'enumerable') ?? descriptor.enumerable,
        configurable: getDesc(key, 'configurable') ?? descriptor.configurable,
      });
    }
  });

  return obj as T;
}

export function watch(scope, handler, options?: { deep?: boolean }) {
  const pl = getIntegration();

  return pl?.watch?.(scope, handler, options);
}
