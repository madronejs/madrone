import {
  describe, it, expect, beforeEach, afterEach,
} from 'vitest';
import {
  addIntegration,
  removeIntegration,
  getIntegration,
  getIntegrations,
  toRaw,
  objectAccessed,
  lastAccessed,
} from '../global';
import { Integration } from '../interfaces';

const noop = () => {};
const noopWatcher = () => noop;
const emptyDescriptor = () => ({});

function createMockIntegration(overrides?: Partial<Integration>): Integration {
  return {
    describeProperty: emptyDescriptor,
    defineProperty: noop,
    describeComputed: emptyDescriptor,
    defineComputed: noop,
    watch: noopWatcher,
    ...overrides,
  };
}

describe('integration registry', () => {
  let mockIntegration: Integration;
  let mockIntegration2: Integration;

  beforeEach(() => {
    // Clear any existing integrations
    for (const integration of getIntegrations()) {
      removeIntegration(integration);
    }

    mockIntegration = createMockIntegration();
    mockIntegration2 = createMockIntegration();
  });

  afterEach(() => {
    // Clean up
    for (const integration of getIntegrations()) {
      removeIntegration(integration);
    }
  });

  describe('addIntegration', () => {
    it('adds integration to registry', () => {
      expect(getIntegrations()).toHaveLength(0);

      addIntegration(mockIntegration);

      expect(getIntegrations()).toHaveLength(1);
      expect(getIntegrations()).toContain(mockIntegration);
    });

    it('sets added integration as current', () => {
      addIntegration(mockIntegration);

      expect(getIntegration()).toBe(mockIntegration);
    });

    it('handles null/undefined gracefully', () => {
      addIntegration(null as unknown as Integration);
      addIntegration(undefined as unknown as Integration);

      expect(getIntegrations()).toHaveLength(0);
    });

    it('does not add duplicate integrations', () => {
      addIntegration(mockIntegration);
      addIntegration(mockIntegration);

      expect(getIntegrations()).toHaveLength(1);
    });
  });

  describe('removeIntegration', () => {
    it('removes integration from registry', () => {
      addIntegration(mockIntegration);
      expect(getIntegrations()).toHaveLength(1);

      removeIntegration(mockIntegration);

      expect(getIntegrations()).toHaveLength(0);
    });

    it('updates current integration when removed', () => {
      addIntegration(mockIntegration);
      addIntegration(mockIntegration2);
      expect(getIntegration()).toBe(mockIntegration2);

      removeIntegration(mockIntegration2);

      expect(getIntegration()).toBe(mockIntegration);
    });

    it('sets current to undefined when all removed', () => {
      addIntegration(mockIntegration);
      removeIntegration(mockIntegration);

      expect(getIntegration()).toBeUndefined();
    });
  });

  describe('getIntegration', () => {
    it('returns undefined when no integrations', () => {
      expect(getIntegration()).toBeUndefined();
    });

    it('returns the last added integration', () => {
      addIntegration(mockIntegration);
      addIntegration(mockIntegration2);

      expect(getIntegration()).toBe(mockIntegration2);
    });
  });

  describe('getIntegrations', () => {
    it('returns empty array when no integrations', () => {
      expect(getIntegrations()).toEqual([]);
    });

    it('returns all registered integrations', () => {
      addIntegration(mockIntegration);
      addIntegration(mockIntegration2);

      const integrations = getIntegrations();

      expect(integrations).toHaveLength(2);
      expect(integrations).toContain(mockIntegration);
      expect(integrations).toContain(mockIntegration2);
    });

    it('returns a copy of the integrations array', () => {
      addIntegration(mockIntegration);

      const integrations = getIntegrations();

      integrations.push(mockIntegration2);

      expect(getIntegrations()).toHaveLength(1);
    });
  });
});

describe('toRaw', () => {
  let mockIntegration: Integration;

  beforeEach(() => {
    // Clear any existing integrations
    for (const integration of getIntegrations()) {
      removeIntegration(integration);
    }
  });

  afterEach(() => {
    for (const integration of getIntegrations()) {
      removeIntegration(integration);
    }
  });

  it('returns object as-is when no integration', () => {
    const obj = { test: 1 };
    const result = toRaw(obj);

    expect(result).toBe(obj);
  });

  it('returns object as-is when integration has no toRaw', () => {
    mockIntegration = createMockIntegration();
    addIntegration(mockIntegration);

    const obj = { test: 1 };
    const result = toRaw(obj);

    expect(result).toBe(obj);
  });

  it('uses integration toRaw when available', () => {
    const rawObj = { original: true };
    const proxyObj = { proxied: true };

    mockIntegration = createMockIntegration({
      toRaw: (obj) => (obj === proxyObj ? rawObj : obj),
    });
    addIntegration(mockIntegration);

    expect(toRaw(proxyObj)).toBe(rawObj);
    expect(toRaw(rawObj)).toBe(rawObj);
  });
});

describe('objectAccessed / lastAccessed', () => {
  let mockIntegration: Integration;

  beforeEach(() => {
    for (const integration of getIntegrations()) {
      removeIntegration(integration);
    }

    mockIntegration = createMockIntegration({
      toRaw: (obj) => obj,
    });
    addIntegration(mockIntegration);
  });

  afterEach(() => {
    for (const integration of getIntegrations()) {
      removeIntegration(integration);
    }
  });

  it('returns undefined for never-accessed objects', () => {
    const obj = { test: 1 };

    expect(lastAccessed(obj)).toBeUndefined();
  });

  it('records access timestamp', () => {
    const obj = { test: 1 };
    const before = Date.now();

    objectAccessed(obj);

    const timestamp = lastAccessed(obj);

    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('updates timestamp on subsequent accesses', async () => {
    const obj = { test: 1 };

    objectAccessed(obj);

    const first = lastAccessed(obj);

    // Wait a small amount to ensure different timestamps
    await new Promise((resolve) => {
      setTimeout(resolve, 5);
    });

    objectAccessed(obj);

    const second = lastAccessed(obj);

    expect(second).toBeGreaterThan(first);
  });

  it('tracks different objects independently', () => {
    const obj1 = { id: 1 };
    const obj2 = { id: 2 };

    objectAccessed(obj1);

    expect(lastAccessed(obj1)).toBeDefined();
    expect(lastAccessed(obj2)).toBeUndefined();

    objectAccessed(obj2);

    expect(lastAccessed(obj1)).toBeDefined();
    expect(lastAccessed(obj2)).toBeDefined();
  });
});
