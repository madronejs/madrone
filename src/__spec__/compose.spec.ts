/* eslint-disable max-classes-per-file, unicorn/consistent-function-scoping */
import { describe, it, expect } from 'vitest';
import {
  reactive, computed, compose, watch,
  type Constructor,
} from '../index';

// `compose` is the functional-mixin alternative to `@classMixin`. Unlike
// the descriptor-replay path, it uses native JS inheritance, so `@reactive`
// field initializers run, `@computed` getters mix in naturally, and types
// flow through `extends` without declaration merging.

describe('compose', () => {
  describe('basic composition', () => {
    it('a single mixin adds its fields to the target via extends', () => {
      const Named = <T extends Constructor>(Base: T) => class extends Base {
        @reactive fName = 'Ada';
      };

      class Person extends compose(Named) {}

      const p = new Person();

      expect(p.fName).toEqual('Ada');
    });

    it('mixin @reactive field initializers carry over (unlike @classMixin)', () => {
      const Counter = <T extends Constructor>(Base: T) => class extends Base {
        @reactive count = 42;
      };

      class Thing extends compose(Counter) {}

      expect(new Thing().count).toEqual(42);
    });

    it('mixin @computed getters work and stay reactive', async () => {
      const Doubler = <T extends Constructor>(Base: T) => class extends Base {
        @reactive source = 3;

        @computed get doubled() {
          return this.source * 2;
        }
      };

      class Thing extends compose(Doubler) {}

      const t = new Thing();

      expect(t.doubled).toEqual(6);

      const seen: number[] = [];
      const stop = watch(() => t.doubled, (val) => {
        seen.push(val);
      });

      t.source = 10;
      await Promise.resolve();
      t.source = 25;
      await Promise.resolve();

      expect(seen).toEqual([20, 50]);
      stop();
    });
  });

  describe('multiple mixins', () => {
    it('composes two mixins — both sets of fields exist on instances', () => {
      const Named = <T extends Constructor>(Base: T) => class extends Base {
        @reactive name = 'Grace';
      };

      const Timestamped = <T extends Constructor>(Base: T) => class extends Base {
        @reactive createdAt = 1000;
      };

      class Person extends compose(Named, Timestamped) {}

      const p = new Person();

      expect(p.name).toEqual('Grace');
      expect(p.createdAt).toEqual(1000);
    });

    it('leftmost mixin is outermost (Redux-style compose semantics)', () => {
      const A = <T extends Constructor>(Base: T) => class extends Base {
        who() { return 'a'; }
      };

      const B = <T extends Constructor>(Base: T) => class extends Base {
        who() { return 'b'; }
      };

      const C = <T extends Constructor>(Base: T) => class extends Base {
        who() { return 'c'; }
      };

      // compose(A, B, C) = A(B(C(Base))). A is outermost; its method wins.
      class X extends compose(A, B, C) {}

      expect(new X().who()).toEqual('a');
    });

    it('target class methods win over composed mixin methods', () => {
      const A = <T extends Constructor>(Base: T) => class extends Base {
        label() { return 'mixin'; }
      };

      class Target extends compose(A) {
        label() { return 'target'; }
      }

      expect(new Target().label()).toEqual('target');
    });
  });

  describe('combined reactive + computed through compose', () => {
    it('full reactive chain works end-to-end', async () => {
      const Named = <T extends Constructor>(Base: T) => class extends Base {
        @reactive fName = 'Ada';
        @reactive lName = 'Lovelace';

        @computed get fullName() {
          return `${this.fName} ${this.lName}`;
        }
      };

      class Person extends compose(Named) {
        @reactive age = 36;
      }

      const p = new Person();

      expect(p.fullName).toEqual('Ada Lovelace');
      expect(p.age).toEqual(36);

      const seen: string[] = [];
      const stop = watch(() => p.fullName, (val) => {
        seen.push(val);
      });

      p.fName = 'Grace';
      await Promise.resolve();
      p.lName = 'Hopper';
      await Promise.resolve();

      expect(p.fullName).toEqual('Grace Hopper');
      expect(seen).toEqual(['Grace Lovelace', 'Grace Hopper']);
      stop();
    });

    it('per-instance state is isolated', () => {
      const Counted = <T extends Constructor>(Base: T) => class extends Base {
        @reactive n = 0;
      };

      class Thing extends compose(Counted) {}

      const a = new Thing();
      const b = new Thing();

      a.n = 1;
      b.n = 2;

      expect(a.n).toEqual(1);
      expect(b.n).toEqual(2);
    });
  });

  describe('type shape', () => {
    it('produces a constructable class with the expected instance shape', () => {
      const Foo = <T extends Constructor>(Base: T) => class extends Base {
        foo = 'foo';
      };

      const Bar = <T extends Constructor>(Base: T) => class extends Base {
        bar = 'bar';
      };

      const Composed = compose(Foo, Bar);
      const instance = new Composed();

      expect((instance as unknown as { foo: string }).foo).toEqual('foo');
      expect((instance as unknown as { bar: string }).bar).toEqual('bar');
    });

    it('handles more than a handful of mixins (no hard arity cap)', () => {
      const M1 = <T extends Constructor>(Base: T) => class extends Base { m1 = 1; };
      const M2 = <T extends Constructor>(Base: T) => class extends Base { m2 = 2; };
      const M3 = <T extends Constructor>(Base: T) => class extends Base { m3 = 3; };
      const M4 = <T extends Constructor>(Base: T) => class extends Base { m4 = 4; };
      const M5 = <T extends Constructor>(Base: T) => class extends Base { m5 = 5; };
      const M6 = <T extends Constructor>(Base: T) => class extends Base { m6 = 6; };
      const M7 = <T extends Constructor>(Base: T) => class extends Base { m7 = 7; };

      class Big extends compose(M1, M2, M3, M4, M5, M6, M7) {}

      const b = new Big() as unknown as Record<string, number>;

      expect(b.m1).toEqual(1);
      expect(b.m2).toEqual(2);
      expect(b.m3).toEqual(3);
      expect(b.m4).toEqual(4);
      expect(b.m5).toEqual(5);
      expect(b.m6).toEqual(6);
      expect(b.m7).toEqual(7);
    });
  });
});
