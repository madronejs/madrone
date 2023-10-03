import * as Vue from 'vue3';
import MadroneVue3 from '../MadroneVue3';
import testAll from './testAll';
import testVue from './testVue';

const integration = MadroneVue3(Vue);

testAll('Vue3', integration);
testVue('Vue3', integration, {
  create: (...args: Parameters<typeof Vue.createApp>) => Vue.createApp(...args).mount(document.createElement('div')),
});
