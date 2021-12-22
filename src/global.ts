import { Integration } from './interfaces';

const GLOBAL_INTEGRATIONS = new Set();

export function addIntegration(plugin: Integration) {
  if (!plugin) return;

  GLOBAL_INTEGRATIONS.add(plugin);
}

export function removeIntegration(plugin) {
  GLOBAL_INTEGRATIONS.delete(plugin);
}

export function getIntegrations() {
  return Array.from(GLOBAL_INTEGRATIONS) as Array<Integration>;
}

export function getIntegration() {
  const integrations = getIntegrations();

  return integrations[integrations.length - 1];
}
