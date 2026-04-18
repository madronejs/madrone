/* eslint-disable max-classes-per-file */
import {
  describe, it, expect, beforeEach, afterEach,
} from 'vitest';
import Madrone, { computed, reactive, MadroneState } from '../index';
import { delay } from '@/test/util';

// These tests cover the case where a class is instantiated *before* an
// integration has been registered (e.g. `new Foo()` runs in a module that
// loads before `Madrone.use(MadroneState)`). The decorator must defer the
// real reactive install until an integration becomes available, rather
// than bailing silently and leaving the instance frozen.

describe('deferred integration setup', () => {
  beforeEach(() => {
    Madrone.unuse(MadroneState);
  });

  afterEach(() => {
    Madrone.use(MadroneState);
  });

  it('@reactive installs lazily once the integration is registered', async () => {
    class Counter {
      @reactive count = 5;
    }

    // Instantiated with no integration active.
    const c = new Counter();

    // Reads/writes before integration work against the stashed value.
    expect(c.count).toBe(5);
    c.count = 7;
    expect(c.count).toBe(7);

    // Register the integration; now reads/writes should be reactive.
    Madrone.use(MadroneState);

    const changes: number[] = [];

    Madrone.watch(() => c.count, (val) => {
      changes.push(val);
    });

    expect(c.count).toBe(7);
    c.count = 9;
    await delay();
    expect(changes).toEqual([9]);
  });

  it('@computed uses the original getter until the integration is registered', () => {
    class Doubler {
      @reactive base = 3;

      @computed get doubled() {
        return this.base * 2;
      }
    }

    const d = new Doubler();

    // Before integration: @computed falls back to calling the original
    // getter directly (no caching, no reactivity tracking).
    expect(d.doubled).toBe(6);
    d.base = 10;
    expect(d.doubled).toBe(20);

    // Register the integration; subsequent access should install the
    // cached computed and start tracking dependencies.
    Madrone.use(MadroneState);

    expect(d.doubled).toBe(20);
    d.base = 100;
    expect(d.doubled).toBe(200);
  });
});
