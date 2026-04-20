/* eslint-disable max-classes-per-file */
import {
  describe, it, expect, beforeEach, afterEach,
} from 'vitest';
import * as Vue from 'vue3';
import { nextTick, watchEffect } from 'vue3';
import Madrone, {
  computed, reactive, MadroneState, MadroneVue3,
} from '../index';

// These tests cover the case where a class is instantiated *before* an
// integration has been registered (e.g. `new Foo()` runs in a module that
// loads before `Madrone.use(...)`). The decorator must defer the real
// reactive install until an integration becomes available, rather than
// bailing silently and leaving the instance frozen.
//
// We exercise this with the Vue integration (not the MadroneState
// integration that madrone's `index.ts` registers by default) to also
// prove the plugin bridge is wired up: once `Madrone.use(MadroneVue)`
// runs, a Vue `watchEffect` that reads a decorated field re-runs when
// that field changes. That only works if (a) the deferred install
// landed, and (b) the active integration is genuinely the Vue one.

const MadroneVue = MadroneVue3(Vue);

describe('deferred integration setup (via Vue integration)', () => {
  beforeEach(() => {
    // Ensure no integration is active at class instantiation time.
    Madrone.unuse(MadroneState);
  });

  afterEach(() => {
    Madrone.unuse(MadroneVue);
    // Restore the default so the rest of the suite sees MadroneState.
    Madrone.use(MadroneState);
  });

  it('defers @reactive install until Vue integration is registered', async () => {
    class Counter {
      @reactive count = 0;
    }

    // Instantiated with no integration active.
    const c = new Counter();

    // Reads/writes before integration work against the stashed value.
    expect(c.count).toBe(0);
    c.count = 7;
    expect(c.count).toBe(7);

    // Register the Vue integration. From here on, reactive changes must
    // propagate through Vue's effect system.
    Madrone.use(MadroneVue);

    const seen: number[] = [];
    const stop = watchEffect(() => {
      seen.push(c.count);
    });

    await nextTick();

    // First run captures the current value (7 from the stash).
    expect(seen).toEqual([7]);

    // Mutating the reactive field should re-run the Vue effect — only
    // possible if the deferred install wired the field up to Vue's
    // reactivity via `MadroneVue`.
    c.count = 9;
    await nextTick();
    expect(seen).toEqual([7, 9]);

    c.count = 12;
    await nextTick();
    expect(seen).toEqual([7, 9, 12]);

    stop();
  });

  it('defers @computed install until Vue integration is registered', async () => {
    class Doubler {
      @reactive base = 3;

      @computed get doubled() {
        return this.base * 2;
      }
    }

    const d = new Doubler();

    // Before integration: the @computed wrapper falls back to calling
    // the original getter directly (no caching, no reactivity).
    expect(d.doubled).toBe(6);
    d.base = 10;
    expect(d.doubled).toBe(20);

    // Install the Vue integration. First access after this installs the
    // cached reactive computed on the instance and starts tracking.
    Madrone.use(MadroneVue);

    const seen: number[] = [];
    const stop = watchEffect(() => {
      seen.push(d.doubled);
    });

    await nextTick();

    // First run sees 20 (current base=10).
    expect(seen).toEqual([20]);

    // Changing the dependency re-runs the Vue effect.
    d.base = 100;
    await nextTick();
    expect(seen).toEqual([20, 200]);

    d.base = 50;
    await nextTick();
    expect(seen).toEqual([20, 200, 100]);

    stop();
  });

  it('bridges @reactive and @computed together through the Vue integration', async () => {
    class User {
      @reactive first = 'Ada';
      @reactive last = 'Lovelace';

      @computed get fullName() {
        return `${this.first} ${this.last}`;
      }
    }

    const u = new User();

    // Pre-integration stash reads.
    expect(u.fullName).toBe('Ada Lovelace');
    u.first = 'Grace';
    expect(u.fullName).toBe('Grace Lovelace');

    Madrone.use(MadroneVue);

    const seen: string[] = [];
    const stop = watchEffect(() => {
      seen.push(u.fullName);
    });

    await nextTick();
    expect(seen).toEqual(['Grace Lovelace']);

    // Each reactive write should trigger the computed to invalidate, which
    // in turn re-triggers the Vue effect.
    u.first = 'Katherine';
    await nextTick();
    expect(seen).toEqual(['Grace Lovelace', 'Katherine Lovelace']);

    u.last = 'Johnson';
    await nextTick();
    expect(seen).toEqual(['Grace Lovelace', 'Katherine Lovelace', 'Katherine Johnson']);

    stop();
  });
});
