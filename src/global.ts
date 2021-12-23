import { Integration } from './interfaces';

const GLOBAL_INTEGRATIONS = new Set();
let CURRENT_INTEGRATION;

export function getIntegrations() {
  return Array.from(GLOBAL_INTEGRATIONS) as Array<Integration>;
}

function getLastIntegration() {
  const integrations = getIntegrations();

  return integrations[integrations.length - 1];
}

function setCurrentIntegration() {
  CURRENT_INTEGRATION = getLastIntegration();
}

export function addIntegration(integration: Integration) {
  if (!integration) return;

  GLOBAL_INTEGRATIONS.add(integration);
  setCurrentIntegration();
}

export function removeIntegration(integration) {
  GLOBAL_INTEGRATIONS.delete(integration);
  setCurrentIntegration();
}

export function getIntegration() {
  return CURRENT_INTEGRATION;
}
