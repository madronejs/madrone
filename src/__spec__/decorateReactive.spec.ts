/* eslint-disable max-classes-per-file */
import { describe, it, expect } from 'vitest';
import { reactive, watch } from '../index';
import { delay } from '@/test/util';

describe('reactive decorator', () => {
  describe('enumerable', () => {
    it('makes properties enumerable by default', () => {
      class Test {
        @reactive test: boolean = true;
      }

      const instance = new Test();

      expect(instance.test).toEqual(true);
      expect(Object.keys(instance)).toEqual(['test']);
    });

    it('can make properties non-enumerable', () => {
      class Test {
        @reactive.configure({ enumerable: false }) test: boolean = true;
      }

      const instance = new Test();

      expect(instance.test).toEqual(true);
      expect(Object.keys(instance)).toEqual([]);
    });
  });

  describe('configurable', () => {
    it('makes properties configurable by default', () => {
      class Test {
        @reactive test: boolean = true;
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
        @reactive.configure({ configurable: false }) test: boolean = true;
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

  it('supports symbol-keyed fields', async () => {
    const key = Symbol('count');

    class Test {
      @reactive [key]: number = 1;
    }

    const instance = new Test();
    const seen: number[] = [];

    watch(() => instance[key], (value) => seen.push(value));
    expect(instance[key]).toEqual(1);
    instance[key] = 2;
    await delay();
    expect(seen).toEqual([2]);
  });
});
