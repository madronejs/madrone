/**
 * @module interfaces
 *
 * Core type definitions for Madrone's reactivity system.
 *
 * These interfaces define the contracts for property descriptors,
 * integrations, and configuration options used throughout Madrone.
 */

/**
 * Extended property descriptor with Madrone-specific options.
 *
 * Extends the standard JavaScript PropertyDescriptor with additional
 * options for controlling reactive behavior.
 */
export interface MadroneDescriptor extends PropertyDescriptor {
  /**
   * Whether to cache computed property values.
   *
   * When true (default), computed values are cached and only recalculated
   * when dependencies change. Set to false to recalculate on every access.
   *
   * @default true
   */
  cache?: boolean,

  /**
   * Whether to make nested objects/arrays reactive.
   *
   * When true (default), all nested objects and arrays within this property
   * will also be wrapped in reactive proxies. Set to false for shallow
   * reactivity where only top-level changes trigger updates.
   *
   * @default true
   */
  deep?: boolean,
}

/**
 * Descriptor options for computed (getter-based) properties.
 *
 * Computed properties derive their value from other reactive state
 * and automatically update when dependencies change.
 */
export type MadroneComputedDescriptor = Pick<
  MadroneDescriptor,
  'get' | 'set' | 'cache' | 'enumerable' | 'configurable'
>;

/**
 * Descriptor options for reactive (value-based) properties.
 *
 * Reactive properties hold state that triggers updates when changed.
 */
export type MadronePropertyDescriptor = Pick<
  MadroneDescriptor,
  'configurable' | 'enumerable' | 'value' | 'deep'
>;

/**
 * A map of property names to their Madrone descriptors.
 *
 * Used when configuring multiple properties at once with `auto()`.
 */
export interface MadroneDescriptorMap {
  [key: string]: MadroneDescriptor,
}

/**
 * Descriptor options available for decorator configuration.
 *
 * Excludes value-related fields since decorators work with
 * class property definitions, not initial values.
 */
export type DecoratorDescriptorType = Omit<MadroneDescriptor, 'get' | 'set' | 'writable' | 'value'>;

/**
 * Configuration options for decorator functions.
 */
export type DecoratorOptionType = {
  /** Property descriptor overrides */
  descriptors?: DecoratorDescriptorType,
};

/**
 * Options for the `watch()` function.
 */
export type WatcherOptions = {
  /**
   * Whether to call the handler immediately with the current value.
   *
   * When true, the handler is invoked once immediately after setting
   * up the watcher, with the current value and undefined as the old value.
   *
   * @default false
   */
  immediate?: boolean,
};

/**
 * Integration-specific options passed to property definition methods.
 *
 * Different integrations may use these options differently based on
 * their underlying reactivity implementation.
 */
export interface IntegrationOptions {
  /** Options passed to reactive property creation */
  reactive?: unknown,
  /** Options passed to computed property creation */
  computed?: unknown,
}

/**
 * Interface that all Madrone integrations must implement.
 *
 * Integrations provide the actual reactivity implementation. Madrone
 * ships with `MadroneState` (standalone) and `MadroneVue3` (Vue 3 integration).
 *
 * @example
 * ```ts
 * // Creating a custom integration
 * const MyIntegration: Integration = {
 *   defineProperty(target, name, config, options) {
 *     // Make the property reactive using your reactivity system
 *   },
 *   defineComputed(target, name, config, options) {
 *     // Create a computed property with caching
 *   },
 *   toRaw(target) {
 *     // Return the unwrapped object
 *   },
 *   watch(scope, handler, options) {
 *     // Set up a reactive watcher
 *     return () => { };  // cleanup function
 *   }
 * };
 * ```
 */
export interface Integration {
  /**
   * Defines a reactive property on an object.
   *
   * @param target - The object to define the property on
   * @param name - The property name
   * @param config - Property configuration
   * @param options - Integration-specific options
   */
  defineProperty: (
    target: object,
    name: string,
    config: MadronePropertyDescriptor,
    options?: IntegrationOptions
  ) => void,

  /**
   * Defines a computed property on an object.
   *
   * @param target - The object to define the property on
   * @param name - The property name
   * @param config - Computed configuration with getter/setter
   * @param options - Integration-specific options
   */
  defineComputed: (
    target: object,
    name: string,
    config: MadroneComputedDescriptor,
    options?: IntegrationOptions
  ) => void,

  /**
   * Unwraps a reactive proxy to get the raw object.
   *
   * @param target - The potentially reactive object
   * @returns The underlying raw object
   */
  toRaw?: <T>(target: T) => T,

  /**
   * Creates a watcher that reacts to changes in reactive state.
   *
   * @param scope - Function that accesses reactive state to watch
   * @param handler - Callback invoked when watched state changes
   * @param options - Watcher configuration
   * @returns A function to stop watching
   */
  watch?: <T>(
    scope: () => T,
    handler: (val: T, old?: T) => void,
    options?: WatcherOptions
  ) => () => void,

  /**
   * Creates a property descriptor for a computed property.
   *
   * Used when you need the descriptor without immediately defining it.
   *
   * @param name - The property name (for debugging)
   * @param config - Computed configuration
   * @param options - Integration-specific options
   * @returns A standard PropertyDescriptor
   */
  describeComputed?: (
    name: string,
    config: MadroneComputedDescriptor,
    options?: IntegrationOptions
  ) => PropertyDescriptor,

  /**
   * Creates a property descriptor for a reactive property.
   *
   * Used when you need the descriptor without immediately defining it.
   *
   * @param name - The property name (for debugging)
   * @param config - Property configuration
   * @param options - Integration-specific options
   * @returns A standard PropertyDescriptor
   */
  describeProperty?: (
    name: string,
    config: MadronePropertyDescriptor,
    options?: IntegrationOptions
  ) => PropertyDescriptor,
}
