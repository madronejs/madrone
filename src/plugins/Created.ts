import { toFunctionArray } from '../util';
import { Plugin } from './index';

const CreatedHookPlugin: Plugin = {
  name: 'created',
  mix: toFunctionArray,
};

export default CreatedHookPlugin;
