import { Integration } from '@/interfaces';

// /////////////////////////////////
// INTEGRATIONS
// /////////////////////////////////

const GLOBAL_INTEGRATIONS = new Set<Integration>();
let CURRENT_INTEGRATION: Integration;

export function getIntegrations() {
  return [...GLOBAL_INTEGRATIONS] as Array<Integration>;
}

function getLastIntegration() {
  const integrations = getIntegrations();

  return integrations.at(-1);
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

// /////////////////////////////////
// STATS
// /////////////////////////////////

const STATS_ACCESS = new WeakMap<object, number>();

/** Get the raw value of an object (without the proxy) */
export function toRaw<T>(obj: T) {
  const getRawItem = getIntegration()?.toRaw ?? (() => obj);

  return getRawItem(obj);
}

/** Mark an object as accessed */
export function objectAccessed(obj: object) {
  STATS_ACCESS.set(toRaw(obj), Date.now());
}

/** The last time any reactive property was accessed on a given object */
export function lastAccessed(obj: object) {
  return STATS_ACCESS.get(toRaw(obj));
}
