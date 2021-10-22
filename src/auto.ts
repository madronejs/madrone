import { getIntegrations } from './global';

// eslint-disable-next-line @typescript-eslint/ban-types
export default function auto<T>(obj: T, options): T {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const [pl] = getIntegrations();
  const state = pl?.integrate?.(obj);

  Object.entries(descriptors).forEach(([key, descriptor]) => {
    if (typeof descriptor.get === 'function' && state?.defineComputed) {
      const cache = options?.describe?.[key]?.cache ?? true;

      state.defineComputed(key, {
        get: descriptor.get?.bind(obj),
        set: descriptor.set?.bind(obj),
        cache,
      });
    } else if (!descriptor.get && state?.defineProperty) {
      state.defineProperty(key, descriptor.value);
    } else {
      Object.defineProperty(obj, key, descriptor);
    }
  });

  return obj as T;
}
