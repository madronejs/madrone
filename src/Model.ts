import { uniqueId } from 'lodash';
import { makeMadrone, MadroneType } from './Madrone';
import { getPlugins, getIntegrations } from './global';
import { mixPlugins, installPlugins, analyzeObject } from './plugins';
import { merge, flattenOptions } from './util';

function Model() {};

/**
 * @param model the model to check
 * @returns if the model is a Madrone.Model
 */
Model.isModel = function isModel(model): boolean {
  return !!model?.$isModel;
};

/**
 * Create a factory model
 * @param shape The shape to create a model for
 */
function createModel<ModelShape extends object>(shape: (ModelShape | MadroneType) | (() => ModelShape | MadroneType)) {
  /** Unique model identifier */
  const id = uniqueId('madrone_model');
  /** Output of the mixed models */
  let shapeCache = {} as ModelShape;
  /** Output of mixed options */
  let optionCache = null;
  /** Output of the mixed models and options */
  let typeCache = null;
  /** Queue of model options to install */
  const optionQueue = [] as Array<Function>;
  /** The options to install */
  const options = [] as Array<object>;
  /** Queue of tasks to compile */
  const shapeQueue = [] as Array<Function>;
  /** The shapes to compose */
  const shapes = [] as Array<object>;
  /** Plugins to integrate with other frameworks or extend functionality */
  const plugins = [];
  /** Mix shapes together */
  const mix = (...items) => {
    shapeQueue.push(() => shapes.push(...items));
  };
  /** Get all global plugins, as well as private plugins for this model */
  const allPlugins = () => [...getPlugins(), ...plugins];
  const getMergedOptions = (...opts) => mixPlugins(flattenOptions(opts), allPlugins());
  /** Lazily compile the shapes */
  const compileShape = () => {
    if (shapeQueue.length) {
      while(shapeQueue.length) {
        shapes.push(shapeQueue.shift()());
      }
      
      shapeCache = merge(...shapes) as ModelShape;
      return true;
    }
    return false;
  };
  const compileOptions = () => {
    if (optionQueue.length || !optionCache) {
      while(optionQueue.length) {
        let def = optionQueue.shift();
        options.push(typeof def === 'function' ? def() : def);
      }

      // @ts-ignore
      optionCache = getMergedOptions(...options, shapeCache.$options, analyzeObject(shapeCache));
      return true;
    }
    return false;
  };
  const compile = () => {
    const dirtyShape = compileShape();
    const dirtyOptions = compileOptions();
    const dirty = dirtyShape || dirtyOptions;
    if (dirty) {
      typeCache = merge(shapeCache, { $options: optionCache });
    }
    return dirty;
  };
  const getOptions = () => {
    compile();
    return optionCache;
  };
  const getShape = () => {
    compile();
    return shapeCache;
  };
  /** Extend a model definition by creating a new one */
  const extend = <A extends object>(newShape: A | ModelShape | MadroneType) => {
    if (Model.isModel(newShape)) {
      return createModel(() => merge(getShape, () => (newShape as { type: A }).type) as A & ModelShape)
        .withOptions(getOptions)
        .withPlugins(plugins);
    }

    return createModel(() => merge(getShape, newShape) as A & ModelShape)
      .withOptions(getOptions)
      .withPlugins(plugins);
  };

  const model = { 
    /** Unique identifier for this model */
    get id() {
      return id as string;
    },
    extend,
    /** The compiled output */
    get shape() {
      compile();
      return shapeCache as ModelShape;
    },
    /** The compiled options */
    get options() {
      compile();
      return optionCache;
    },
    /** The shape and options combined into a final "type" */
    get type() {
      compile();
      return typeCache as ModelShape & { $options: any };
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
    /** Add options to this model */
    withOptions(...items) {
      optionQueue.push(...items);
      return model;
    },
    /** Create an instance of this model type */
    create(data?: object, { app = null, root = null, parent = null } = {}) {
      compileShape();
      compileOptions();
      return makeMadrone({
        model,
        data,
        app,
        root,
        parent,
        options: model.options,
        type: model.type,
        install: (ctx) => {
          const [pl] = getIntegrations();

          if (typeof pl?.integrate === 'function') {
            ctx.$state = pl.integrate(ctx);
          }

          installPlugins(ctx, optionCache, allPlugins());
        },
      });
    },
  };

  Object.defineProperty(model, '$isModel', { value: true });
  mix(shape);

  return model;
}
Model.create = createModel;

export default Model;
