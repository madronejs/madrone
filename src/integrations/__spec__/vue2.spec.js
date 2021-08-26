import Vue from 'vue2';
import MadroneVue from '../MadroneVue';
import testAll from './testAll';
import testVue from './testVue';

const integration = MadroneVue(Vue);

// disable devtools warnings
Vue.config.productionTip = false;
Vue.config.devtools = false;

testAll('Vue2', integration);
testVue('Vue2', integration, { create: (...args) => new Vue(...args) });
