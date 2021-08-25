import { uniqueId } from 'lodash';
import Madrone, { MadroneType } from './Madrone';
import { getPlugins, mixPlugins, installPlugins, analyzeObject } from './plugins';
import { merge, flattenOptions } from './util';

function Model() {};

function createModel<ModelShape extends object>(shape: (ModelShape | MadroneType)) {
  /** Unique model identifier */
  const id = uniqueId('madrone_model');
  /** Output of the mixed models */
  let mixinCache = {} as ModelShape;
  /** Output of mixed features */
  let featureCache = null;
  /** Queue of model features to install */
  const featureQueue = [] as Array<Function>;
  /** The features to install */
  const features = [] as Array<object>;
  /** Queue of tasks to compile */
  const mixQueue = [] as Array<Function>;
  /** The shapes to compose */
  const mixins = [] as Array<object>;
  /** Plugins to integrate with other frameworks or extend functionality */
  const plugins = [];
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
  const getMergedFeats = (...feats) => mixPlugins(flattenOptions(feats), allPlugins());
  const compileFeats = () => {
    if (featureQueue.length || !featureCache) {
      while(featureQueue.length) {
        let def = featureQueue.shift();
        features.push(typeof def === 'function' ? def() : def);
      }

      // @ts-ignore
      featureCache = getMergedFeats(...features, mixinCache.$options, analyzeObject(mixinCache));
      return true;
    }
    return false;
  };
  const allPlugins = () => [...getPlugins(), ...plugins];
  const feats = () => {
    compileFeats();
    return featureCache;
  };
  /** The output in function form */
  const mixin = () => {
    compileType();
    return mixinCache;
  };
  /** Extend a model definition by creating a new one */
  const extend = <A extends object>(shape: A | ModelShape | MadroneType) => {
    return createModel(() => merge(mixin, shape) as A & ModelShape).withFeatures(feats).withPlugins(plugins);
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
    /** The compiled features */
    get feats() {
      compileType();
      return feats();
    },
    /** The plugins added to this model */
    get plugins() {
      return plugins;
    },
    /** Add plugins to this model */
    withPlugins(...items) {
      plugins.push(...items);
      return model;
    },
    /** Add features to this model */
    withFeatures(...items) {
      featureQueue.push(...items);
      return model;
    },
    /** Create an instance of this model type */
    create(data?: object) {
      compileType();
      compileFeats();
      return Madrone.create({
        model,
        data,
        feats: model.feats,
        type: model.mixed,
        install: (ctx) => installPlugins(ctx, featureCache, allPlugins()),
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
