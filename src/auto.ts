import { getIntegrations } from './global';

// eslint-disable-next-line @typescript-eslint/ban-types
export function auto<T>(obj: T, options): T {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const [pl] = getIntegrations();
  const state = pl?.integrate?.(obj);

  Object.entries(descriptors).forEach(([key, descriptor]) => {
    if (typeof descriptor.get === 'function' && state?.defineComputed) {
      const cache = options?.describe?.[key]?.cache ?? true;

      state.defineComputed(key, {
        get: descriptor.get?.bind(obj),
        set: descriptor.set?.bind(obj),
        enumerable: descriptor.enumerable,
        configurable: descriptor.configurable,
        cache,
      });
    } else if (!descriptor.get && state?.defineProperty) {
      state.defineProperty(key, {
        value: descriptor.value,
        enumerable: descriptor.enumerable,
        configurable: descriptor.configurable,
      });
    }
  });

  return obj as T;
}

export function watch(scope, handler, options) {
  const [pl] = getIntegrations();

  return pl?.watch?.(scope, handler, options);
}
