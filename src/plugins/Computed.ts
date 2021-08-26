import { toFlatObject } from '../util';
import { Plugin } from '../interfaces';

const ComputedPlugin: Plugin = {
  name: 'computed',
  mix: toFlatObject,
  install: (ctx, mixed) => {
    Object.keys(mixed || {}).forEach((key) => {
      const comp = mixed[key];

      ctx.$defineProperty(key, {
        configurable: true,
        get: comp?.get || comp,
        set: comp?.set,
        cache: comp?.cache == null ? true : !!comp?.cache,
      });
    });
  },
};

export default ComputedPlugin;
