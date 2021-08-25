import { uniqueId } from 'lodash';
import Madrone from './Madrone';
import { merge, Spread } from './util';

const Model = {
  /**
   * @returns a new model
   */
  create<T extends object[]>(...shape: [...T]) {
    type Merged = Spread<T>
    /** Unique model identifier */
    const id = uniqueId('madrone_model');
    /** Output of the mixed models */
    let mixinCache = {} as Merged;
    /** Queue of tasks to compile */
    const mixQueue = [] as Array<Function>;
    /** The shapes to compose */
    const mixins = [] as Array<object>;
    /** Plugins to integrate with other frameworks or extend functionality */
    const plugins = [];
    /** The model options */
    const options = {};
    /** Mix shapes together */
    const mix = (...items) => {
      mixQueue.push(() => mixins.push(...items));
    };
    /** Lazily compile the mixins */
    const compile = () => {
      if (mixQueue.length) {
        while(mixQueue.length) {
          mixins.push(mixQueue.shift()());
        }
        
        mixinCache = merge(...mixins) as Merged;
      }
      
      return mixinCache;
    };
    /** The output in function form */
    const mixin = () => {
      compile();
      return mixinCache;
    };
    /** Extend a model definition */
    const extend = <A extends object>(shape: A | Merged) => {
      return Model.create(mixin, shape as A);
    };

    const model = { 
      /** Unique identifier for this model */
      get id() {
        return id as string;
      },
      mixin,
      extend,
      /** The compiled output */
      get mixed() {
        return this.mixin() as Merged;
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
        data
        return Madrone.create(mixinCache as Merged, data, {
          options: this.options,
        });
      },
    };

    Object.defineProperty(model, '$isModel', { value: true });
    mix(shape);

    return model;
  },

  isModel(model) {
    return !!model?.$isModel;
  },
};

export default Model;
