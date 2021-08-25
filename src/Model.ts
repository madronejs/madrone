import { uniqueId } from 'lodash';
import Madrone from './Madrone';
import { getPlugins, installPlugins, analyzeObject } from './plugins';
import { merge } from './util';

function Model() {};

function createModel<ModelShape extends object>(shape: ModelShape | (() => ModelShape)) {
  /** Unique model identifier */
  const id = uniqueId('madrone_model');
  /** Output of the mixed models */
  let mixinCache = {} as ModelShape;
  /** Queue of tasks to compile */
  const mixQueue = [] as Array<Function>;
  /** The shapes to compose */
  const mixins = [] as Array<object>;
  /** Plugins to integrate with other frameworks or extend functionality */
  const plugins = [];
  /** The model options */
  let options = null;
  /** Mix shapes together */
  const mix = (...items) => {
    mixQueue.push(() => mixins.push(...items));
  };
  /** Lazily compile the mixins */
  const compileType = () => {
    if (mixQueue.length) {
      while(mixQueue.length) {
        mixins.push(mixQueue.shift()());
      }
      
      mixinCache = merge(...mixins) as ModelShape;

      return true;
    }

    return false;
  };
  const allPlugins = () => [...getPlugins(), ...plugins];
  const compile = () => {
    if (compileType() || !options) {
      options = analyzeObject(mixinCache);
    }
  };
  /** The output in function form */
  const mixin = () => {
    compileType();
    return mixinCache;
  };
  /** Extend a model definition by creating a new one */
  const extend = <A extends object>(shape: A | ModelShape) => {
    return createModel(() => merge(mixin, shape) as A & ModelShape).withPlugins(plugins);
  };

  const model = { 
    /** Unique identifier for this model */
    get id() {
      return id as string;
    },
    extend,
    /** The compiled output */
    get mixed() {
      return mixin() as ModelShape;
    },
    /** The plugins added to this model */
    get plugins() {
      return plugins;
    },
    /** Add options to this model */
    withOptions(opts) {
      Object.assign(options, opts || {});
      return model;
    },
    /** Add plugins to this model */
    withPlugins(...items) {
      plugins.push(...items);
      return model;
    },
    /** Create an instance of this model type */
    create(data?: object) {
      compile();
      return Madrone.create({
        model,
        data,
        options,
        type: model.mixed,
        install: (ctx) => installPlugins(ctx, options, allPlugins()),
      });
    },
  };

  Object.defineProperty(model, '$isModel', { value: true });
  mix(shape);

  return model;
}

Model.create = createModel;
Model.isModel = function isModel(model) {
  return !!model?.$isModel;
};

export default Model;
