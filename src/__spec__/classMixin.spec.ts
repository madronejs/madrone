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
});
