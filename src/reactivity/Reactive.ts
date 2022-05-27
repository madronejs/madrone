import typeHandlers from './typeHandlers';
import { addReactive, isReactiveTarget, isReactive, getReactive } from './global';

/**
 * Observe an object
 * @param {Object} target the object to observe
 * @param {Object} options the observation options
 * @returns {Proxy} a proxied version of the object that can be observed
 */
export default function Reactive(target, options?) {
  // if we've already made an Reactive from the target, return the existing one
  if (isReactiveTarget(target)) return getReactive(target);

  // this is already a proxied target... don't need to track it again
  if (isReactive(target)) return target;

  const opts = options || {};
  const newOptions = { deep: true, ...opts, root: opts.root || target };
  const type = Reactive.getStringType(target);

  // make sure we're looking at something we can observe
  // if not, return the original
  if (!Reactive.hasHandler(type)) return target;

  const proxy = new Proxy(target, Reactive.typeHandler(type, newOptions));

  addReactive(target, proxy);

  return proxy;
}

Reactive.typeHandlers = typeHandlers;
Reactive.getStringType = (obj) => Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
Reactive.hasHandler = (type) => !!Reactive.typeHandlers[type];
Reactive.typeHandler = (type, hooks) => Reactive.typeHandlers[type]?.(hooks);
