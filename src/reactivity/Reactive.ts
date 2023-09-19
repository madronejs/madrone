import typeHandlers from './typeHandlers';
import { addReactive, isReactiveTarget, isReactive, getReactive } from './global';
import { ReactiveOptions } from './interfaces';

/**
 * Observe an object
 * @param {Object} target the object to observe
 * @param {Object} options the observation options
 * @returns {Proxy} a proxied version of the object that can be observed
 */
export default function Reactive<T extends object>(target: T, options?: ReactiveOptions<T>): T {
  // if we've already made an Reactive from the target, return the existing one
  if (isReactiveTarget(target)) return getReactive(target);

  // this is already a proxied target... don't need to track it again
  if (isReactive(target)) return target;

  const opts = options || {};
  const newOptions = { ...opts, deep: opts?.deep ?? true };
  const type = Reactive.getStringType(target);

  // make sure we're looking at something we can observe
  // if not, return the original
  if (!Reactive.hasHandler(type)) return target;

  const proxy = new Proxy(target, Reactive.typeHandler(type, newOptions));

  addReactive(target, proxy);

  return proxy;
}

Reactive.getStringType = (obj) => Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
Reactive.hasHandler = (type) => !!typeHandlers[type];
Reactive.typeHandler = (type, hooks) => typeHandlers[type]?.(hooks);
