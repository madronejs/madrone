import { Integration } from './interfaces';

const GLOBAL_PLUGINS = new Set();
const GLOBAL_INTEGRATIONS = new Set();

export function addPlugin(plugin: Integration) {
  if (!plugin) return;

  GLOBAL_INTEGRATIONS.add(plugin);
}

export function removePlugin(plugin) {
  GLOBAL_PLUGINS.delete(plugin);
  GLOBAL_INTEGRATIONS.delete(plugin);
}

export function getPlugins() {
  return Array.from(GLOBAL_PLUGINS) as Array<Integration>;
}

export function getIntegrations() {
  return Array.from(GLOBAL_INTEGRATIONS) as Array<Integration>;
}

export function getIntegration() {
  const integrations = getIntegrations();

  return integrations[integrations.length - 1];
}
