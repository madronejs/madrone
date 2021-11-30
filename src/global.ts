import { Plugin } from './interfaces';

const GLOBAL_PLUGINS = new Set();
const GLOBAL_INTEGRATIONS = new Set();

export function addPlugin(plugin: Plugin) {
  if (!plugin) return;

  if (plugin.integrate) {
    GLOBAL_INTEGRATIONS.add(plugin);
  }

  if (plugin.mix || plugin.install) {
    GLOBAL_PLUGINS.add(plugin);
  }
}

export function removePlugin(plugin) {
  GLOBAL_PLUGINS.delete(plugin);
  GLOBAL_INTEGRATIONS.delete(plugin);
}

export function getPlugins() {
  return Array.from(GLOBAL_PLUGINS) as Array<Plugin>;
}

export function getIntegrations() {
  return Array.from(GLOBAL_INTEGRATIONS) as Array<Plugin>;
}

export function getIntegration() {
  const integrations = getIntegrations();

  return integrations[integrations.length - 1];
}
