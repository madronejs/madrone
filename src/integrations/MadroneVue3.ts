/**
 * @module MadroneVue3
 *
 * Vue 3 integration for Madrone, bridging Madrone's reactivity with Vue's system.
 *
 * This integration allows you to use Madrone's composition patterns and decorators
 * while having reactivity work seamlessly with Vue 3's rendering system. Vue
 * components will automatically re-render when Madrone state changes.
 *
 * @example
 * ```ts
 * import Madrone from '@madronejs/core';
 * import { MadroneVue3 } from '@madronejs/core';
 * import { reactive, toRaw } from 'vue';
 *
 * // Initialize with Vue 3's reactive system
 * Madrone.use(MadroneVue3({ reactive, toRaw }));
 *
 * // Now Madrone state works with Vue components
 * const store = auto({
 *   count: 0,
 *   get doubled() { return this.count * 2; }
 * });
 * ```
 */

import { objectAccessed } from '@/global';
import { ReactiveOptions } from '@/reactivity/interfaces';
import { ObservableHooksType } from '@/reactivity/Observer';
import type { Integration } from '@/interfaces';
import MStateDefault from './MadroneState';
import * as MadroneState from './MadroneState';

type KeyType = string | number | symbol;

const FORBIDDEN = new Set<KeyType>(['__proto__', '__ob__']);
const VALUE = 'value';

// Keys that Vue may track when iterating collections (Set/Map)
// Used to identify which accessed keys need notification on structural changes
const ITERATION_KEYS = new Set<KeyType>([
  Symbol.iterator,
  'size',
  'has',
  'get',
  'values',
  'keys',
  'entries',
  'forEach',
]);

// reactive setter
const reactiveSet = (item: { value: number }) => {
  item[VALUE] += 1;
};

/**
 * Options for creating a Vue 3 integration.
 */
export interface MadroneVue3Options {
  /** Vue's `reactive()` function from 'vue' */
  reactive: <T extends object>(target: T) => unknown,
  /** Vue's `toRaw()` function from 'vue' */
  toRaw: <T>(proxy: T) => T,
}

/**
 * Creates a Vue 3-compatible integration for Madrone.
 *
 * This factory function creates an integration that bridges Madrone's
 * reactivity with Vue 3's reactive system. Changes to Madrone state
 * will trigger Vue component re-renders.
 *
 * For simpler setup, use the pre-configured `madrone/integrations/vue` module instead.
 *
 * @param options - Vue 3 reactivity functions
 * @param options.reactive - Vue's `reactive()` function from 'vue'
 * @param options.toRaw - Vue's `toRaw()` function from 'vue'
 * @returns An Integration compatible with Madrone.use()
 * @throws Error if reactive function is not provided
 *
 * @example
 * ```ts
 * // Option 1: Use the pre-configured module (recommended)
 * import Madrone from '@madronejs/core';
 * import { MadroneVue } from '@madronejs/core';
 * Madrone.use(MadroneVue);
 *
 * // Option 2: Manual configuration
 * import Madrone from '@madronejs/core';
 * import { MadroneVue3 as createMadroneVue3 } from '@madronejs/core';
 * import { reactive, toRaw } from 'vue';
 * Madrone.use(createMadroneVue3({ reactive, toRaw }));
 * ```
 */
export default function MadroneVue3(options: MadroneVue3Options): Integration {
  if (!options?.reactive || typeof options.reactive !== 'function') {
    throw new Error(
      'MadroneVue3 requires Vue\'s reactive function. '
      + 'Either use "madrone/integrations/vue" for automatic setup, '
      + 'or pass { reactive, toRaw } from "vue".'
    );
  }

  const { reactive, toRaw } = options;
  const obToRaw = toRaw ?? ((val) => val);
  // store all reactive properties
  const reactiveMappings = new WeakMap<object, Map<string, { value: number }>>();
  // track which iteration keys Vue has accessed per target (for Set/Map reactivity)
  const accessedIterationKeys = new WeakMap<object, Set<KeyType>>();

  // track an iteration key access for later notification
  const trackIterationKey = (target: object, key: KeyType) => {
    if (!ITERATION_KEYS.has(key)) return;
    const rawTarget = obToRaw(target);
    let keys = accessedIterationKeys.get(rawTarget);
    if (!keys) {
      keys = new Set();
      accessedIterationKeys.set(rawTarget, keys);
    }
    keys.add(key);
  };
  // get or add a tracked property
  const getOrAdd = (parent, key) => {
    const rawItem = obToRaw(parent);
    let item = reactiveMappings.get(rawItem);

    if (!item) {
      item = new Map<string, { value: number }>();
      reactiveMappings.set(rawItem, item);
    }

    let keyItem = item.get(key);

    if (!keyItem) {
      keyItem = reactive({ [VALUE]: 0 }) as { value: number };
      item.set(key, keyItem);
    }

    return keyItem;
  };

  // depend on a reactive property
  const depend = (cp, key?: KeyType) => {
    if (FORBIDDEN.has(key)) return;

    Reflect.get(getOrAdd(cp, key), VALUE);
  };
  // invalidate the reactive property
  const notify = (cp, key?: KeyType) => {
    if (FORBIDDEN.has(key)) return;

    reactiveSet(getOrAdd(cp, key));
  };

  const deleteIfNeeded = (parent, key: KeyType) => {
    const rawItem = obToRaw(parent);
    const item = reactiveMappings.get(rawItem);

    if (item) notify(item, key);

    reactiveMappings.delete(rawItem);
  };

  const reactiveOptions: ReactiveOptions = {
    onGet: ({ target, key }) => {
      objectAccessed(target);
      depend(target, key);
      trackIterationKey(target, key);
    },
    onHas: ({ target, key }) => {
      depend(target, key);
    },
    onDelete: ({ target, key }) => {
      deleteIfNeeded(target, key);
    },
    onSet: ({ target, key, keysChanged }) => {
      notify(target, key);

      if (keysChanged) {
        // Notify the general "keys changed" sentinel
        notify(target);
        // Notify only the iteration keys that Vue has actually accessed on this target
        // This fixes reactivity for Set/Map when Vue directly observes iteration
        const tracked = accessedIterationKeys.get(obToRaw(target));
        if (tracked) {
          for (const iterKey of tracked) {
            notify(target, iterKey);
          }
        }
      }
    },
    needsProxy: ({ key }) => !FORBIDDEN.has(key),
  };
  const computedOptions: ObservableHooksType<any> = {
    onGet: (cp) => {
      depend(cp, cp.name);
    },
    onImmediateChange: (cp) => {
      notify(cp, cp.name);
    },
  };

  const integrationOptions = {
    computed: computedOptions,
    reactive: reactiveOptions,
  };

  function describeComputed(name, config) {
    return MadroneState.describeComputed(name, config, integrationOptions);
  }

  function describeProperty(name, config) {
    return MadroneState.describeProperty(name, config, integrationOptions);
  }

  function defineComputed(target, name, config) {
    return MadroneState.defineComputed(target, name, config, integrationOptions);
  }

  function defineProperty(target, name, config) {
    return MadroneState.defineProperty(target, name, config, integrationOptions);
  }

  return {
    toRaw: MStateDefault.toRaw,
    watch: MadroneState.watch,
    describeProperty,
    defineProperty,
    describeComputed,
    defineComputed,
  };
}
