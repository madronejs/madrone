import { addIntegration, removeIntegration } from './global';
import { auto, define, watch } from './auto';
import { MadroneState } from './integrations';

addIntegration(MadroneState);

/**
 * @namespace
 */
const Madrone = {
  /** Configure a global plugin */
  use: addIntegration,
  /** Remove a global plugin */
  unuse: removeIntegration,
  /** Create reactive objects */
  auto,
  /** Define properties on objects */
  define,
  /** Watch reactive objects */
  watch,
};

export default Madrone;
export * from './integrations';
export * from './decorate';
export { merge, applyClassMixins } from './util';
