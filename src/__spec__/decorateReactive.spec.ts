/* eslint-disable max-classes-per-file */
import { reactive } from '../index';

describe('reactive decorator', () => {
  describe('enumerable', () => {
    it('makes properties enumerable by default', () => {
      class Test {
        @reactive test: boolean;

        constructor() {
          this.test = true;
        }
      }

      const instance = new Test();

      expect(instance.test).toEqual(true);
      expect(Object.keys(instance)).toEqual(['test']);
    });

    it('can make properties non-enumerable', () => {
      class Test {
        @reactive.configure({ enumerable: false })
        test: boolean;

        constructor() {
          this.test = true;
        }
      }

      const instance = new Test();

      expect(instance.test).toEqual(true);
      expect(Object.keys(instance)).toEqual([]);
    });
  });

  describe('configurable', () => {
    it('makes properties non-configurable by default', () => {
      class Test {
        @reactive test: boolean;

        constructor() {
          this.test = true;
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

    it('can make properties configurable', () => {
      class Test {
        @reactive.configure({ configurable: true }) test: boolean;

        constructor() {
          this.test = true;
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
  });
});
