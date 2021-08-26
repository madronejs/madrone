import { toFunctionArray } from '../util';
import { Plugin } from '../interfaces';

const CreatedHookPlugin: Plugin = {
  name: 'created',
  mix: toFunctionArray,
};

export default CreatedHookPlugin;
