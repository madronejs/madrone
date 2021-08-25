import cloneDeep from 'lodash/cloneDeep';
import lodashSet from 'lodash/set';
import { MadroneType } from '../Madrone';
import Data from './Data';

export interface Plugin {
  readonly name: string,
  mix?: (toMix: Array<any>) => any,
  install?: (ctx: MadroneType, values: any) => void
}

const GLOBAL_PLUGINS = new Set();

export function addPlugin(plugin) {
  GLOBAL_PLUGINS.add(plugin);
}

export function getPlugins() {
  return Array.from(GLOBAL_PLUGINS);
}

export function analyzeObject(obj) {
  const descriptors = Object.getOwnPropertyDescriptors(obj || {});
  let model = {} as { computed?: object, methods?: object, data?: Function };
  const data = {};

  Object.entries(descriptors).forEach(([key, descriptor]) => {
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

export function mixPlugins(flatOptions: object, plugins: Array<Plugin>) {
  const mixedModel = { ...(flatOptions || {}) };

  plugins.forEach(({ name, mix }) => {
    const val = mixedModel[name];

    if (typeof mix === 'function' && val) {
      mixedModel[name] = mix(val);
    } else if (Array.isArray(val)) {
      mixedModel[name] = mixedModel[name][mixedModel[name].length - 1];
    }
  });

  return mixedModel;
}

export function installPlugins(ctx: MadroneType, mixedOptions: object = {}, plugins: Array<Plugin>) {
  plugins.forEach(({ name, install }) => {
    if (typeof install === 'function') {
      install(ctx, mixedOptions[name]);
    }
  });
}

addPlugin(Data);
