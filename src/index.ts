import Model from './Model';
import { addPlugin } from './plugins'

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

export default Madrone;
export * from './integrations';
export * from './plugins';