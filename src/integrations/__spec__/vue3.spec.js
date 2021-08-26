import * as Vue from 'vue3';
import MadroneVue from '../MadroneVue';
import testAll from './testAll';
import testVue from './testVue';

const integration = MadroneVue(Vue);

testAll('Vue3', integration);
testVue('Vue3', integration, {
  create: (...args) => Vue.createApp(...args).mount(document.createElement('div')),
});
