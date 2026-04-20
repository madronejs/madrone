/* eslint-disable max-classes-per-file */
import { describe, it, expect } from 'vitest';
import { reactive, computed, watch } from '../index';

// Static `@reactive` / `@computed` support. Under TC39 standard decorators,
// a static field's `addInitializer` callback runs with `this` bound to the
// class constructor, so the same install path works — reactivity lands on
// the class itself.

describe('static @reactive', () => {
  it('makes a static field reactive', async () => {
    class Counter {
      @reactive static count = 0;
    }

    expect(Counter.count).toBe(0);

    const seen: number[] = [];
    const stop = watch(() => Counter.count, (v) => {
      seen.push(v);
    });

    Counter.count = 5;
    await Promise.resolve();
    Counter.count = 9;
    await Promise.resolve();

    expect(seen).toEqual([5, 9]);
    stop();
  });

  it('honors .configure overrides on statics', () => {
    class Hidden {
      @reactive.configure({ enumerable: false }) static secret = 42;
    }

    expect(Hidden.secret).toBe(42);
    expect(Object.keys(Hidden)).not.toContain('secret');
  });

  it('.shallow works on statics', () => {
    class Wrapper {
      @reactive.shallow static data = { nested: { n: 1 } };
    }

    let calls = 0;
    const stop = watch(() => Wrapper.data, () => {
      calls += 1;
    });

    // Deep mutation shouldn't fire — shallow only tracks reassignment.
    Wrapper.data.nested.n = 2;
    expect(calls).toBe(0);

    // Replacement does fire.
    Wrapper.data = { nested: { n: 3 } };

    return Promise.resolve().then(() => {
      expect(calls).toBe(1);
      stop();
    });
  });
});

describe('static @computed', () => {
  it('caches static computed getters backed by static @reactive', () => {
    let calls = 0;

    class Cached {
      @reactive static source = 1;

      @computed static get derived() {
        calls += 1;

        return Cached.source * 10;
      }
    }

    expect(Cached.derived).toBe(10);
    expect(Cached.derived).toBe(10);
    expect(Cached.derived).toBe(10);
    expect(calls).toBe(1);

    Cached.source = 2;
    expect(Cached.derived).toBe(20);
    expect(calls).toBe(2);
  });

  it('watch() reacts to static @computed changes', async () => {
    class Tracked {
      @reactive static a = 1;
      @reactive static b = 2;

      @computed static get sum() {
        return Tracked.a + Tracked.b;
      }
    }

    const seen: number[] = [];
    const stop = watch(() => Tracked.sum, (v) => {
      seen.push(v);
    });

    Tracked.a = 10;
    await Promise.resolve();
    Tracked.b = 20;
    await Promise.resolve();

    expect(seen).toEqual([12, 30]);
    stop();
  });

  it('static computed with paired setter', () => {
    class Paired {
      @reactive static _val: string = 'init';

      @computed static get val() {
        return Paired._val;
      }

      static set val(v: string) {
        Paired._val = `[${v}]`;
      }
    }

    expect(Paired.val).toBe('init');

    Paired.val = 'x';

    expect(Paired._val).toBe('[x]');
    expect(Paired.val).toBe('[x]');
  });
});

describe('static decorator inheritance', () => {
  it('subclass static @reactive does not mutate parent static metadata', () => {
    class Parent {
      @reactive static a = 1;
    }

    class Child extends Parent {
      @reactive static b = 2;
    }

    expect(Parent.a).toBe(1);
    expect((Child as unknown as { b: number }).b).toBe(2);

    Parent.a = 10;

    // Each class has its own static storage; Parent.a changes don't affect
    // Child's own static (Child.a is inherited via proto chain from Parent).
    expect(Parent.a).toBe(10);
  });
});
