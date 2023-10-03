import { addIntegration, removeIntegration, lastAccessed } from '@/global';
import { auto, define, watch } from '@/auto';
import { MadroneState } from '@/integrations';

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
  /** Get the last time any reactive property was touched on a given object */
  lastAccessed,
};

export default Madrone;
export * from '@/integrations';
export * from '@/interfaces';
export * from '@/decorate';
export { toRaw } from '@/global';
export { merge, applyClassMixins } from '@/util';
export { watch, auto } from '@/auto';
