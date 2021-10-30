import Model from './Model';
import { addPlugin, removePlugin } from './global';
import { auto, watch } from './auto';
import {
  CreatedPlugin,
  ComputedPlugin,
  DataPlugin,
  MethodsPlugin,
  ModelsPlugin,
  WatchPlugin,
} from './plugins';

// minimum required plugins
addPlugin(MethodsPlugin);
addPlugin(ModelsPlugin);
addPlugin(DataPlugin);
addPlugin(ComputedPlugin);
addPlugin(WatchPlugin);
addPlugin(CreatedPlugin);

/**
 * @namespace
 */
const Madrone = {
  Model,
  /**
   * Check if an object is Madrone
   * @param instance the instance to check
   * @returns if the given object is a Madrone instance or not
   */
  isMadrone: (instance) => !!instance?.$isMadrone,
  /** Configure a global plugin */
  use: addPlugin,
  /** Remove a global plugin */
  unuse: removePlugin,
  /** Create reactive objects */
  auto,
  /** Watch reactive objects */
  watch,
};

export default Madrone;
export * from './reactivity';
export * from './integrations';
export * from './plugins';
export * from './decorate';
export { merge } from './util';
