/**
 * @module reactivity/interfaces
 *
 * Type definitions for the low-level reactivity system.
 */

/**
 * Options passed to type handler hooks when reactive operations occur.
 *
 * @typeParam T - The type of the reactive target
 */
export type TypeHandlerOptions<T extends object = object> = {
  /** Name for debugging */
  name?: string,
  /** Whether deep reactivity is enabled */
  deep?: boolean,
  /** The Proxy receiver */
  receiver?: T,
  /** The raw target object */
  target?: T,
  /** The property key being accessed/modified */
  key?: PropertyKey,
  /** The value being set */
  value?: unknown,
  /** Whether the operation changed the object's keys */
  keysChanged?: boolean,
  /** Whether the operation changed a value */
  valueChanged?: boolean,
};

/**
 * Hook function called on reactive operations.
 * @typeParam T - The type of the reactive target
 */
export type HandlerHookType<T extends object = object> = (options: TypeHandlerOptions<T>) => void;

/**
 * Hook function that determines if a value should be wrapped in a Proxy.
 * @typeParam T - The type of the reactive target
 */
export type CheckProxyHookType<T extends object = object> = (options: {
  target: T,
  key: PropertyKey,
  value: unknown,
}) => boolean;

/**
 * Collection of hooks for reactive Proxy handlers.
 * @typeParam T - The type of the reactive target
 */
export type ReactiveHandlerHooks<T extends object = object> = {
  /** Called when a property is read */
  onGet: HandlerHookType<T>,
  /** Called when a property is set */
  onSet: HandlerHookType<T>,
  /** Called when a property is deleted */
  onDelete: HandlerHookType<T>,
  /** Called when `in` operator or `has` trap is triggered */
  onHas: HandlerHookType<T>,
  /** Determines if a value should be wrapped in a reactive Proxy */
  needsProxy: CheckProxyHookType<T>,
};

/**
 * Configuration options for creating reactive Proxies.
 *
 * @typeParam T - The type of the object being made reactive
 */
export type ReactiveOptions<T extends object = object> = {
  /** Name for debugging purposes */
  name?: string,
  /** Whether to recursively make nested objects reactive (default: true) */
  deep?: boolean,
} & Partial<ReactiveHandlerHooks<T>>;
