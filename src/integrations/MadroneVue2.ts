import MadroneVue from './MadroneVue';

export default (Vue) => {
  return MadroneVue({
    reactive: Vue.observable,
    set: Vue.set,
    init: (ctx) => {
      // HACK: TDR 2021-04-23 -- make Vue think this is a Vue item
      // so it doesn't try to observe/traverse the structure
      Object.defineProperties(ctx, {
        _isVue: { value: true },
        _data: { value: {} },
        $refs: { value: {} },
      });
    },
  });
}