import { toFunctionArray } from '../util';
import Plugin from './Plugin';

const CreatedHookPlugin: Plugin = {
  name: 'created',
  mix: toFunctionArray,
};

export default CreatedHookPlugin;
