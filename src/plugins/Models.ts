import { toFlatObject } from '../util';
import { Plugin } from '../interfaces';

/** Convenient way to store model mappings for $createNode */
const ModelsPlugin: Plugin = {
  name: 'models',
  mix: toFlatObject,
  install: (ctx, mixed) => {
    Object.assign(ctx.$models, mixed);
  },
};

export default ModelsPlugin;
