import { addIntegration, removeIntegration } from './global';
import { auto, watch } from './auto';
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
  /** Watch reactive objects */
  watch,
};

export default Madrone;
export * from './integrations';
export * from './decorate';
export { merge, applyClassMixins } from './util';
