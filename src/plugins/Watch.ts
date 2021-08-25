import { toFlatObject } from '../util';
import Plugin from './Plugin';

const WatchPlugin: Plugin = {
  name: 'watch',
  mix: toFlatObject,
  install: (ctx, mixed) => {
    Object.entries(mixed || {}).forEach(([key, value]) => {
      ctx.$watch(key, value as any);
    });
  },
};

export default WatchPlugin;
