/**
 * @module vue
 *
 * Pre-configured Vue 3 integration for Madrone.
 *
 * This module automatically imports Vue's reactivity functions, so you don't
 * need to pass them manually. Just import and use directly.
 *
 * @example
 * ```ts
 * import Madrone from '@madronejs/core';
 * import { MadroneVue } from '@madronejs/core';
 *
 * Madrone.use(MadroneVue);
 *
 * // That's it! Madrone now works with Vue's reactivity
 * ```
 */

import { reactive, toRaw } from 'vue';
import createMadroneVue3 from './MadroneVue3';

/**
 * Pre-configured Vue 3 integration.
 *
 * Uses Vue's `reactive` and `toRaw` functions automatically.
 * This is the recommended way to use Madrone with Vue 3.
 *
 * @example
 * ```ts
 * import Madrone from '@madronejs/core';
 * import { MadroneVue } from '@madronejs/core';
 *
 * // Simple one-liner setup
 * Madrone.use(MadroneVue);
 *
 * // Create reactive state that works with Vue components
 * const store = auto({
 *   count: 0,
 *   get doubled() { return this.count * 2; }
 * });
 * ```
 */
const MadroneVue = createMadroneVue3({ reactive, toRaw });

export default MadroneVue;
