import cloneDeep from 'lodash/cloneDeep';
import difference from 'lodash/difference';
import lodashSet from 'lodash/set';
import { MadroneType } from '../Madrone';
import { Integration } from '../integrations';
import Computed from './Computed';
import Created from './Created';
import Data from './Data';
import Methods from './Methods';
import Watch from './Watch';

export interface Plugin {
  readonly name: string
  mix?: (toMix: Array<any>) => any
  install?: (ctx: MadroneType, values: any) => void
  integrate?: (ctx: MadroneType) => Integration
}

export { Computed as ComputedPlugin };
export { Created as CreatedPlugin };
export { Data as DataPlugin };
export { Methods as MethodsPlugin };
export { Watch as WatchPlugin };

const GLOBAL_PLUGINS = new Set();
const GLOBAL_INTEGRATIONS = new Set();

export function addPlugin(plugin: Plugin) {
  if (plugin.integrate) {
    GLOBAL_INTEGRATIONS.add(plugin);
  }

  if (plugin.mix || plugin.install) {
    GLOBAL_PLUGINS.add(plugin);
  }
}

addPlugin(Methods);
addPlugin(Data);
addPlugin(Computed);
addPlugin(Watch);
addPlugin(Created);

export function getPlugins() {
  return Array.from(GLOBAL_PLUGINS);
}

export function analyzeObject(obj) {
  const descriptors = Object.getOwnPropertyDescriptors(obj || {});
  let model = {} as { computed?: object, methods?: object, data?: Function };
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

export function mixPlugins(flatOptions: object, plugins: Array<Plugin>) {
  const mixedModel = { ...(flatOptions || {}) };
  const nonPluginKeys = difference(Object.keys(flatOptions), plugins.map(({ name }) => name));

  // mix based on the plugin definition
  plugins.forEach(({ name, mix }) => {
    const val = mixedModel[name];

    if (typeof mix === 'function' && val) {
      mixedModel[name] = mix(val);
    } else if (Array.isArray(val)) {
      mixedModel[name] = val[val.length - 1];
    }
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

export function installPlugins(ctx: MadroneType, mixedOptions: object = {}, plugins: Array<Plugin>) {
  plugins.forEach(({ name, install }) => {
    if (typeof install === 'function') {
      install(ctx, mixedOptions[name]);
    }
  });
}
