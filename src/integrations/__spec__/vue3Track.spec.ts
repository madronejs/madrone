import { track, trigger } from '@vue/reactivity';
import * as Vue from 'vue3';
import MadroneVue3 from '../MadroneVue3';
import testAll from './testAll';
import testVue from './testVue';
import testVueCollections from './testVueCollections';

// the same suites as vue3.spec.ts, with dependencies recorded through Vue's own track and trigger
const integration = MadroneVue3({ ...Vue, track, trigger });
const vueOptions = {
  create: (...args: Parameters<typeof Vue.createApp>) => Vue.createApp(...args).mount(document.createElement('div')),
};

testAll('Vue3 track', integration);
testVue('Vue3 track', integration, vueOptions);
testVueCollections('Vue3 track', integration, vueOptions);
