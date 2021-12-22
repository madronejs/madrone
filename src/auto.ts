import { getIntegration } from './global';

// eslint-disable-next-line @typescript-eslint/ban-types
export function auto<T>(obj: T, options?: any): T {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const pl = getIntegration();

  Object.entries(descriptors).forEach(([key, descriptor]) => {
    if (typeof descriptor.get === 'function' && pl?.defineComputed) {
      const cache = options?.describe?.[key]?.cache ?? true;

      pl.defineComputed(obj, key, {
        get: descriptor.get?.bind(obj),
        set: descriptor.set?.bind(obj),
        enumerable: descriptor.enumerable,
        configurable: descriptor.configurable,
        cache,
      });
    } else if (!descriptor.get && pl?.defineProperty) {
      pl.defineProperty(obj, key, {
        value: descriptor.value,
        enumerable: descriptor.enumerable,
        configurable: descriptor.configurable,
      });
    }
  });

  return obj as T;
}

export function watch(scope, handler, options?: { deep?: boolean }) {
  const pl = getIntegration();

  return pl?.watch?.(scope, handler, options);
}
