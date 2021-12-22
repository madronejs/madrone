import { addPlugin, removePlugin } from './global';
import { auto, watch } from './auto';
import { MadroneState } from './integrations';

addPlugin(MadroneState);

/**
 * @namespace
 */
const Madrone = {
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
export * from './decorate';
export { merge, applyClassMixins } from './util';
