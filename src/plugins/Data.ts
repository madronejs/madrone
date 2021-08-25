import { toFunctionArray } from '../util';
import Plugin from './Plugin';

const DataPlugin: Plugin = {
  name: 'data',
  mix: toFunctionArray,
  install: (ctx, mixed) => {
    const newData = {};

    [].concat(mixed || []).forEach((dt) => {
      Object.assign(newData, dt.call(ctx));
    });
    Object.keys(newData).forEach((key) => {
      ctx.$defineProperty(key, {
        configurable: true,
        value: newData[key],
      });
    });
  },
};

export default DataPlugin;