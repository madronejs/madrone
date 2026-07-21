import {
  describe, it, expect, beforeAll, afterAll,
} from 'vitest';
import * as Vue from 'vue3';
import Madrone from '../../index';
import MadroneVue3 from '../MadroneVue3';
import MadroneVue from '../vue';
import testAll from './testAll';
import testVue from './testVue';
import testVueCollections from './testVueCollections';

const integration = MadroneVue3(Vue);
const vueOptions = {
  create: (...args: Parameters<typeof Vue.createApp>) => Vue.createApp(...args).mount(document.createElement('div')),
};

testAll('Vue3', integration);
testVue('Vue3', integration, vueOptions);
testVueCollections('Vue3', integration, vueOptions);

describe('Vue3 sync watchers', () => {
  beforeAll(() => {
    Madrone.use(integration);
  });
  afterAll(() => {
    Madrone.unuse(integration);
  });

  it('a flush:sync watcher reads the written value on an in-place write', () => {
    const state = Madrone.auto({ name: 'Event 1' });
    const seen: string[] = [];
    const stop = Vue.watch(() => state.name, (val) => {
      seen.push(val);
    }, { flush: 'sync' });

    state.name = 'Event 2';

    expect(seen).toEqual(['Event 2']);
    stop();
  });

  it('a flush:sync watcher on a Vue computed does not go permanently stale', () => {
    const state = Madrone.auto({ name: 'a' });
    const signature = Vue.computed(() => state.name);
    const seen: string[] = [];
    const stop = Vue.watch(signature, (val) => {
      seen.push(val);
    }, { flush: 'sync' });

    state.name = 'b';

    // Pre-fix, the sync watcher re-evaluated the computed mid-set-trap, read the
    // old value, and settled clean — leaving the computed stale even after the
    // write landed, with no later notification to recover it.
    expect(seen).toEqual(['b']);
    expect(signature.value).toBe('b');
    stop();
  });
});

describe('MadroneVue pre-configured module', () => {
  it('exports a valid integration', () => {
    expect(MadroneVue).toBeDefined();
    expect(MadroneVue.defineProperty).toBeTypeOf('function');
    expect(MadroneVue.defineComputed).toBeTypeOf('function');
    expect(MadroneVue.watch).toBeTypeOf('function');
    expect(MadroneVue.toRaw).toBeTypeOf('function');
  });
});

describe('MadroneVue3 error handling', () => {
  it('throws helpful error when called without arguments', () => {
    expect(() => MadroneVue3(undefined as never)).toThrow('MadroneVue3 requires Vue\'s reactive function');
  });

  it('throws helpful error when called with empty object', () => {
    expect(() => MadroneVue3({} as never)).toThrow('MadroneVue3 requires Vue\'s reactive function');
  });
});
