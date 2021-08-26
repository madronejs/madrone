import Model from './Model';
import { addPlugin, removePlugin } from './global'
import { CreatedPlugin, ComputedPlugin, DataPlugin, MethodsPlugin, WatchPlugin } from './plugins';

// minimum required plugins
addPlugin(MethodsPlugin);
addPlugin(DataPlugin);
addPlugin(ComputedPlugin);
addPlugin(WatchPlugin);
addPlugin(CreatedPlugin);
function Madrone() {}
Madrone.Model = Model;
/**
 * Check if an object is Madrone
 * @param instance the instance to check
 * @returns if the given object is a Madrone instance or not
 */
Madrone.isMadrone = (instance) => !!instance?.$isMadrone;
/** Configure a global plugin */
Madrone.use = addPlugin;
/** Remove a global plugin */
Madrone.unuse = removePlugin;

export default Madrone;
export * from './integrations';
export * from './plugins';