import { describe, it, expect } from 'vitest';
import * as Vue from 'vue3';
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
