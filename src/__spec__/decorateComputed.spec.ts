/* eslint-disable max-classes-per-file */
import { describe, it, expect } from 'vitest';
import { computed } from '../index';

describe('computed decorator', () => {
  describe('enumerable', () => {
    it('makes properties non-enumerable by default', () => {
      // Matches native JS semantics for class getters — `class X { get foo() {} }`
      // puts `foo` on the prototype as non-enumerable. This also prevents
      // `{ ...instance }` from accidentally triggering every computed getter.
      class Test {
        @computed get test() {
          return true;
        }
      }

      const instance = new Test();

      expect(instance.test).toEqual(true);
      expect(Object.keys(instance)).toEqual([]);
    });

    it('can make properties enumerable', () => {
      class Test {
        @computed.configure({ enumerable: true })
        get test() {
          return true;
        }
      }

      const instance = new Test();

      expect(instance.test).toEqual(true);
      expect(Object.keys(instance)).toEqual(['test']);
    });
  });

  describe('configurable', () => {
    it('makes properties configurable by default', () => {
      class Test {
        @computed get test() {
          return true;
        }
      }

      const instance = new Test();
      let error: Error;

      expect(instance.test).toEqual(true);

      try {
        // attempt to redefine property
        Object.defineProperty(instance, 'test', {
          configurable: true,
        });
      } catch (error_) {
        error = error_;
      }

      expect(error?.message).toBeUndefined();
    });

    it('can make properties non-configurable', () => {
      class Test {
        @computed.configure({ configurable: false })
        get test() {
          return true;
        }
      }

      const instance = new Test();
      let error: Error;

      expect(instance.test).toEqual(true);

      try {
        // attempt to redefine property
        Object.defineProperty(instance, 'test', {
          configurable: true,
        });
      } catch (error_) {
        error = error_;
      }

      expect(error?.message).toEqual('Cannot redefine property: test');
    });
  });
});
