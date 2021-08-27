import { toFlatObject } from '../util';
import { Plugin } from '../interfaces';

const MethodsPlugin: Plugin = {
  name: 'methods',
  mix: toFlatObject,
  install: (ctx, mixed) => {
    Object.assign(ctx, mixed || {});
  },
};

export default MethodsPlugin;
