/* eslint-disable max-classes-per-file, @typescript-eslint/no-unsafe-declaration-merging */
import { describe, it, expect } from 'vitest';
import {
  reactive, computed, classMixin, watch,
} from '../index';
import { getMadroneMeta } from '../mixinSupport';

// TC39 standard decorator metadata is attached per class via
// `Object.create(parent[Symbol.metadata])`, so property access walks the
// prototype chain. Without own-property discipline, a subclass's decorator
// writes would mutate the parent's metadata array. These tests lock that
// behavior down: subclasses see ancestor entries via proto-chain but never
// mutate them, and `@classMixin(Child)` correctly picks up Parent's fields.

describe('decorator metadata under native `extends`', () => {
  it('does not mutate parent metadata when a subclass declares its own @reactive', () => {
    class Parent {
      @reactive a = 1;
    }

    class Child extends Parent {
      @reactive b = 2;
    }

    const parentKeys = (getMadroneMeta(Parent) ?? []).map((e) => e.key);
    const childKeys = (getMadroneMeta(Child) ?? []).map((e) => e.key).toSorted();

    expect(parentKeys).toEqual(['a']);
    expect(childKeys).toEqual(['a', 'b']);
  });

  it('keeps parent and child instances independently reactive', async () => {
    class Parent {
      @reactive p = 0;
    }

    class Child extends Parent {
      @reactive c = 0;
    }

    const parent = new Parent();
    const child = new Child();

    const parentSeen: number[] = [];
    const childSeenP: number[] = [];
    const childSeenC: number[] = [];

    const stopParent = watch(() => parent.p, (v) => {
      parentSeen.push(v);
    });
    const stopChildP = watch(() => child.p, (v) => {
      childSeenP.push(v);
    });
    const stopChildC = watch(() => child.c, (v) => {
      childSeenC.push(v);
    });

    parent.p = 1;
    child.p = 10;
    child.c = 100;
    await Promise.resolve();

    expect(parent.p).toBe(1);
    expect(child.p).toBe(10);
    expect(child.c).toBe(100);
    expect(parentSeen).toEqual([1]);
    expect(childSeenP).toEqual([10]);
    expect(childSeenC).toEqual([100]);

    stopParent();
    stopChildP();
    stopChildC();
  });

  it('classMixin(Child) installs both Parent and Child @reactive fields on the target', async () => {
    class Parent {
      @reactive pa: string;
    }

    class Child extends Parent {
      @reactive ca: string;
    }

    @classMixin(Child)
    class Target {}

    interface Target extends Child {}

    const t = new Target();

    // Both keys should be reactive on target instances.
    t.pa = 'parent!';
    t.ca = 'child!';

    expect(t.pa).toBe('parent!');
    expect(t.ca).toBe('child!');

    const seenPa: string[] = [];
    const seenCa: string[] = [];
    const stopPa = watch(() => t.pa, (v) => {
      seenPa.push(v);
    });
    const stopCa = watch(() => t.ca, (v) => {
      seenCa.push(v);
    });

    t.pa = 'p2';
    await Promise.resolve();
    t.ca = 'c2';
    await Promise.resolve();

    expect(seenPa).toEqual(['p2']);
    expect(seenCa).toEqual(['c2']);

    stopPa();
    stopCa();
  });

  it('classMixin(Parent) does not leak subclass fields onto the target', () => {
    class Parent {
      @reactive only: string;
    }

    class Child extends Parent {
      @reactive leaked: string;
    }

    // Use Child to force its decorator entries to land somewhere — if they
    // had leaked onto Parent, the test below would pick up `leaked` too.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _child = new Child();

    @classMixin(Parent)
    class Target {}

    interface Target extends Parent {}

    const parentKeys = (getMadroneMeta(Parent) ?? []).map((e) => e.key);

    expect(parentKeys).toEqual(['only']);

    // `leaked` must not be a reactive field on Target — writing to an
    // un-decorated key should create a plain own data property (no reactive
    // machinery), which is what the undecorated base class behavior is.
    const t = new Target();

    (t as unknown as { leaked: string }).leaked = 'set';
    expect((t as unknown as { leaked: string }).leaked).toBe('set');
  });

  it('@computed metadata on a subclass does not contaminate the parent', () => {
    class Parent {
      @reactive val = 1;

      @computed get doubled() {
        return this.val * 2;
      }
    }

    class Child extends Parent {
      @computed get tripled() {
        return this.val * 3;
      }
    }

    const parentKeys = (getMadroneMeta(Parent) ?? []).map((e) => e.key).toSorted();
    const childKeys = (getMadroneMeta(Child) ?? []).map((e) => e.key).toSorted();

    expect(parentKeys).toEqual(['doubled', 'val']);
    expect(childKeys).toEqual(['doubled', 'tripled', 'val']);
  });
});
