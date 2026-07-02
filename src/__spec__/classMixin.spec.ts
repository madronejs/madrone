/* eslint-disable max-classes-per-file, @typescript-eslint/no-unsafe-declaration-merging */
import { describe, it, expect } from 'vitest';
import {
  reactive, computed, classMixin, watch,
} from '../index';

// `@classMixin` copies own prototype descriptors (methods, getters, setters)
// from each mixin onto the target's prototype and replays `@reactive` /
// `@computed` decorator metadata so mixed-in reactivity works on target
// instances. Under TC39 standard decorators, a `@reactive` field decorator
// only runs for instances of its declaring class — so a mixed-in field's
// initial value (`= 0`) is not carried across the mixin boundary. Mixed-in
// reactive fields start as `undefined` and become reactive on first write.

describe('classMixin', () => {
  describe('methods', () => {
    it('copies plain prototype methods from a mixin onto the target', () => {
      class Greeter {
        greet(name: string) {
          return `hello ${name}`;
        }
      }

      @classMixin(Greeter)
      class Target {}

      interface Target extends Greeter {}

      expect(new Target().greet('world')).toEqual('hello world');
    });

    it('target methods win over mixin methods for the same key', () => {
      class Base {
        label() { return 'base'; }
      }

      @classMixin(Base)
      class Target {
        label() { return 'target'; }
      }

      interface Target extends Base {}

      expect(new Target().label()).toEqual('target');
    });

    it('applies multiple mixins; later mixins win over earlier ones', () => {
      class First {
        who() { return 'first'; }
        only_first() { return 1; }
      }

      class Second {
        who() { return 'second'; }
      }

      @classMixin(First, Second)
      class Target {}

      interface Target extends First, Second {}

      const t = new Target();

      expect(t.who()).toEqual('second');
      expect(t.only_first()).toEqual(1);
    });
  });

  describe('@reactive fields from a mixin', () => {
    it('is reactive on the target; starts undefined (field initializer does not cross the boundary)', async () => {
      class NamedMixin {
        @reactive fName: string;
      }

      @classMixin(NamedMixin)
      class Target {}

      interface Target extends NamedMixin {}

      const t = new Target();

      expect(t.fName).toBeUndefined();

      const seen: Array<string | undefined> = [];
      const stop = watch(() => t.fName, (val) => {
        seen.push(val);
      });

      t.fName = 'Ada';
      await Promise.resolve();
      t.fName = 'Grace';
      await Promise.resolve();

      expect(seen).toEqual(['Ada', 'Grace']);
      stop();
    });

    it('keeps per-instance reactivity independent across target instances', async () => {
      class Shared {
        @reactive value: number;
      }

      @classMixin(Shared)
      class Target {}

      interface Target extends Shared {}

      const a = new Target();
      const b = new Target();

      a.value = 1;
      b.value = 2;

      expect(a.value).toBe(1);
      expect(b.value).toBe(2);

      a.value = 10;

      expect(a.value).toBe(10);
      expect(b.value).toBe(2);
    });
  });

  describe('@computed getters from a mixin', () => {
    it('mixes in a @computed getter that stays cached and reactive', async () => {
      class Doubler {
        @computed get doubled() {
          return (this as unknown as { base: number }).base * 2;
        }
      }

      @classMixin(Doubler)
      class Target {
        @reactive base = 2;
      }

      interface Target extends Doubler {}

      const t = new Target();

      expect(t.doubled).toEqual(4);

      const seen: number[] = [];
      const stop = watch(() => t.doubled, (val) => {
        seen.push(val);
      });

      t.base = 5;
      await Promise.resolve();
      t.base = 7;
      await Promise.resolve();

      expect(seen).toEqual([10, 14]);
      stop();
    });

    it('preserves a setter paired with a @computed getter across the mixin boundary', () => {
      type TargetShape = { _val: number };

      class WithPair {
        @computed get val(): number {
          return (this as unknown as TargetShape)._val;
        }

        set val(v: number) {
          (this as unknown as TargetShape)._val = v * 10;
        }
      }

      @classMixin(WithPair)
      class Target {
        @reactive _val = 1;
      }

      interface Target extends WithPair {}

      const t = new Target();

      expect(t.val).toEqual(1);

      t.val = 3;

      expect(t._val).toEqual(30);
      expect(t.val).toEqual(30);
    });

    it('target @computed overrides mixin @computed for the same key', () => {
      class MixA {
        @computed get who() { return 'mix'; }
      }

      @classMixin(MixA)
      class Target {
        @computed get who() { return 'target'; }
      }

      interface Target extends MixA {}

      expect(new Target().who).toEqual('target');
    });
  });

  describe('combined @reactive + @computed through a mixin', () => {
    it('reacts through the full chain once mixin @reactive fields are written', async () => {
      class NamedMixin {
        @reactive fName: string;
        @reactive lName: string;

        @computed get fullName() {
          return `${this.fName ?? 'Anon'} ${this.lName ?? 'User'}`;
        }
      }

      @classMixin(NamedMixin)
      class Person {
        @reactive age: number;
      }

      interface Person extends NamedMixin {}

      const p = new Person();

      // Before any write, mixin @reactive fields are undefined.
      expect(p.fullName).toEqual('Anon User');

      const seen: string[] = [];
      const stop = watch(() => p.fullName, (val) => {
        seen.push(val);
      });

      p.fName = 'Ada';
      await Promise.resolve();
      p.lName = 'Lovelace';
      await Promise.resolve();

      expect(p.fullName).toEqual('Ada Lovelace');
      expect(seen).toEqual(['Ada User', 'Ada Lovelace']);
      stop();
    });
  });

  describe('multi-level chains: @reactive overriding a deeper @computed', () => {
    // A two-level mixin chain: GrandParent declares a getter-only @computed,
    // Parent overrides it as a writable @reactive, and Leaf composes Parent.
    // The prototype merge copies GrandParent's getter-only accessor down onto
    // each descendant prototype; the metadata replay must still install the
    // @reactive override on the leaf, or writes to leaf instances throw
    // "Cannot set property ... which has only a getter".
    it('keeps the property writable on a leaf that inherits the override without redeclaring', () => {
      class GrandParent {
        @computed get amountTransferred(): number { return 0; }
      }

      @classMixin(GrandParent)
      class Parent {
        @reactive amountTransferred: number;
      }
      interface Parent extends GrandParent {}

      @classMixin(Parent)
      class Leaf {}
      interface Leaf extends Parent {}

      const leaf = new Leaf();
      const write = () => {
        leaf.amountTransferred = 5;
      };

      expect(write).not.toThrow();
      expect(leaf.amountTransferred).toEqual(5);
    });

    it('wires the inherited override into the reactive graph on the leaf', async () => {
      class GrandParent {
        @computed get progress(): number { return 0; }
      }

      @classMixin(GrandParent)
      class Parent {
        @reactive progress: number;
      }
      interface Parent extends GrandParent {}

      @classMixin(Parent)
      class Leaf {}
      interface Leaf extends Parent {}

      const leaf = new Leaf();
      const seen: number[] = [];
      const stop = watch(() => leaf.progress, (val) => {
        seen.push(val);
      });

      leaf.progress = 1;
      await Promise.resolve();
      leaf.progress = 2;
      await Promise.resolve();

      expect(leaf.progress).toEqual(2);
      expect(seen).toEqual([1, 2]);
      stop();
    });
  });

  describe('multi-level chains: a plain member overriding a deeper @reactive', () => {
    // Inverse of #76: a leaf's undecorated method/getter override of a base
    // @reactive, through more than one mixin level, must win over the replay.
    it('keeps a leaf plain-method override of a base @reactive field through two mixin levels', () => {
      class GrandParent {
        @reactive transform: (x: number) => number;
      }

      @classMixin(GrandParent)
      class Parent {}
      interface Parent extends GrandParent {}

      @classMixin(Parent)
      class Leaf {
        transform(x: number) {
          return x * 2;
        }
      }
      interface Leaf extends Parent {}

      const leaf = new Leaf();

      expect(typeof leaf.transform).toEqual('function');
      expect(leaf.transform(21)).toEqual(42);
    });

    it('keeps a leaf plain-getter override of a base @reactive field through two mixin levels', () => {
      class GrandParent {
        @reactive label: string;
      }

      @classMixin(GrandParent)
      class Parent {}
      interface Parent extends GrandParent {}

      @classMixin(Parent)
      class Leaf {
        get label(): string {
          return 'leaf';
        }
      }
      interface Leaf extends Parent {}

      const leaf = new Leaf();

      expect(leaf.label).toEqual('leaf');
    });

    it('still installs the reactive when the leaf does NOT redeclare (preserves #76)', () => {
      class GrandParent {
        @computed get amount(): number {
          return 0;
        }
      }

      @classMixin(GrandParent)
      class Parent {
        @reactive amount: number;
      }
      interface Parent extends GrandParent {}

      @classMixin(Parent)
      class Leaf {}
      interface Leaf extends Parent {}

      const leaf = new Leaf();

      expect(() => {
        leaf.amount = 5;
      }).not.toThrow();
      expect(leaf.amount).toEqual(5);
    });
  });
});
