import cloneDeep from 'lodash/cloneDeep';
import difference from 'lodash/difference';
import lodashSet from 'lodash/set';
import { MadroneType } from '../Madrone';
import { Plugin } from '../interfaces';
import Computed from './Computed';
import Created from './Created';
import Data from './Data';
import Methods from './Methods';
import Models from './Models';
import Relationships from './Relationships';
import Watch from './Watch';

export { Relationships as RelationshipsPlugin };
export { Computed as ComputedPlugin };
export { Created as CreatedPlugin };
export { Data as DataPlugin };
export { Methods as MethodsPlugin };
export { Models as ModelsPlugin };
export { Watch as WatchPlugin };

export function analyzeObject(obj) {
  const descriptors = Object.getOwnPropertyDescriptors(obj || {});
  const model = {} as { computed?: any; methods?: any; data?: () => any };
  const data = {};

  Object.entries(descriptors).forEach(([key, descriptor]) => {
    if (key === '$options') return;

    const { get, set, value } = descriptor;

    if (typeof get === 'function') {
      lodashSet(model, ['computed', key], {
        get,
        set,
      });
    } else if (typeof value === 'function') {
      lodashSet(model, ['methods', key], value);
    } else {
      data[key] = value;
    }
  });

  if (Object.keys(data).length) {
    model.data = function getData() {
      return cloneDeep(data);
    };
  }

  return model;
}

export function mixPlugins(flatOptions: any, plugins: Array<Plugin>) {
  const mixedModel = { ...(flatOptions || {}) };
  const nonPluginKeys = difference(
    Object.keys(flatOptions),
    plugins.map(({ name }) => name)
  );
  const mergeArray = [];

  // mix based on the plugin definition
  plugins.forEach(({ name, mix, mergeValues }) => {
    const val = mixedModel[name];

    if (typeof mix === 'function' && val) {
      mixedModel[name] = mix(val);
    } else if (Array.isArray(val)) {
      mixedModel[name] = val[val.length - 1];
    }

    if (typeof mergeValues === 'function') {
      // keep track of all the features that have "mergeValues" so we can
      // call those after we finish mixin the initial features
      mergeArray.push(mergeValues);
    }
  });

  mergeArray.forEach((mergeValues) => {
    mergeValues(mixedModel);
  });

  // take the last item for every non-plugin based keyword
  nonPluginKeys.forEach((key) => {
    const val = mixedModel[key];

    if (Array.isArray(val)) {
      mixedModel[key] = val[val.length - 1];
    }
  });

  return mixedModel;
}

export function installPlugins(ctx: MadroneType, mixedOptions: any, plugins: Array<Plugin>) {
  plugins.forEach(({ name, install }) => {
    if (typeof install === 'function') {
      install(ctx, mixedOptions[name]);
    }
  });
}
