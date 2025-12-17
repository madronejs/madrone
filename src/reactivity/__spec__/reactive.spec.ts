/* eslint-disable max-classes-per-file */
import { describe, it, expect } from 'vitest';
import Reactive from '../Reactive';
import { isReactiveTarget, isReactive } from '../global';

describe('Reactive', () => {
  it('reuses existing Reactives if same object passed', () => {
    const object = { one: { two: { string: 'hello' } } };
    const obs = Reactive(object);
    const obs2 = Reactive(object);

    expect(obs !== object).toEqual(true);
    expect(obs === obs2).toEqual(true);
  });

  it('reuses existing Reactives if tracked item passed', () => {
    const object = { one: { two: { string: 'hello' } } };
    const obs = Reactive(object);
    const obs2 = Reactive(obs);

    expect(obs === obs2).toEqual(true);
  });

  it('reuses existing tracked item set as child to other tracked item', () => {
    const object = { one: true };
    const object2 = { two: false };
    const obs = Reactive<any>(object);
    const obs2 = Reactive(object2);

    obs.nested = obs2;

    expect(obs.nested === obs2).toEqual(true);
  });

  describe('class instance handling', () => {
    it('does not wrap class instances in Proxy', () => {
      class SomeClass {
        value = 42;
      }

      const instance = new SomeClass();
      const state = Reactive({ instance });

      // The class instance should NOT be proxied (deep wrapping stops at class instances)
      expect(isReactive(state.instance)).toBe(false);
      expect(state.instance).toBe(instance);
      expect(state.instance.value).toBe(42);
    });

    it('proxies plain objects but not nested class instances', () => {
      class MyClass {
        data = 'test';
      }

      const nested = new MyClass();
      const state = Reactive({
        plain: { value: 1 },
        classInstance: nested,
      });

      // Plain nested object IS proxied
      expect(isReactive(state.plain)).toBe(true);
      // Class instance is NOT proxied
      expect(isReactive(state.classInstance)).toBe(false);
      expect(state.classInstance).toBe(nested);
    });

    it('works with Object.create(null) objects', () => {
      const nullProto = Object.create(null);

      nullProto.value = 1;

      const state = Reactive({ data: nullProto });

      // Object.create(null) should be treated as plain object and proxied
      expect(isReactive(state.data)).toBe(true);
    });
  });

  describe('built-in object handling', () => {
    it('does not wrap Date in Proxy', () => {
      const date = new Date();
      const state = Reactive({ date });

      expect(isReactive(state.date)).toBe(false);
      expect(state.date).toBe(date);
      expect(state.date.getTime()).toBe(date.getTime());
    });

    it('does not wrap RegExp in Proxy', () => {
      const regex = /test/gi;
      const state = Reactive({ regex });

      expect(isReactive(state.regex)).toBe(false);
      expect(state.regex).toBe(regex);
      expect(state.regex.test('test')).toBe(true);
    });

    it('does not wrap Error in Proxy', () => {
      const error = new Error('test error');
      const state = Reactive({ error });

      expect(isReactive(state.error)).toBe(false);
      expect(state.error).toBe(error);
      expect(state.error.message).toBe('test error');
    });

    it('does not wrap WeakMap in Proxy', () => {
      const weakMap = new WeakMap();
      const key = {};

      weakMap.set(key, 'value');

      const state = Reactive({ weakMap });

      expect(isReactive(state.weakMap)).toBe(false);
      expect(state.weakMap).toBe(weakMap);
      expect(state.weakMap.get(key)).toBe('value');
    });

    it('does not wrap WeakSet in Proxy', () => {
      const weakSet = new WeakSet();
      const item = {};

      weakSet.add(item);

      const state = Reactive({ weakSet });

      expect(isReactive(state.weakSet)).toBe(false);
      expect(state.weakSet).toBe(weakSet);
      expect(state.weakSet.has(item)).toBe(true);
    });
  });

  describe('Promise handling', () => {
    it('does not wrap Promises in Proxy', () => {
      const promise = Promise.resolve('test');
      const state = Reactive({ promise });

      // The promise should be the same instance, not a proxy
      expect(state.promise).toBe(promise);
      expect(isReactive(state.promise)).toBe(false);
    });

    it('allows .then() to be called on nested Promises', async () => {
      const state = Reactive({
        promise: Promise.resolve('success'),
      });

      const result = await state.promise.then((val) => val.toUpperCase());

      expect(result).toBe('SUCCESS');
    });

    it('allows Promise.all with nested Promises', async () => {
      const state = Reactive({
        promises: [
          Promise.resolve(1),
          Promise.resolve(2),
          Promise.resolve(3),
        ],
      });

      const results = await Promise.all(state.promises);

      expect(results).toEqual([1, 2, 3]);
    });

    it('allows async/await with nested Promises', async () => {
      const state = Reactive({
        getData: () => Promise.resolve({ data: 'hello' }),
      });

      const result = await state.getData();

      expect(result.data).toBe('hello');
    });

    it('allows .catch() and .finally() on nested Promises', async () => {
      let finallyCalled = false;
      const state = Reactive({
        promise: Promise.reject(new Error('test error')),
      });

      const result = await state.promise
        .catch((error) => error.message)
        .finally(() => { finallyCalled = true; });

      expect(result).toBe('test error');
      expect(finallyCalled).toBe(true);
    });
  });

  describe('object', () => {
    it('creates nested Reactives', () => {
      const object = { one: { two: { string: 'hello' } } };

      expect(isReactiveTarget(object)).toEqual(false);

      const obs = Reactive(object);

      expect(isReactiveTarget(object)).toEqual(true);
      expect(isReactive(object)).toEqual(false);
      expect(isReactive(obs)).toEqual(true);
      expect(isReactive(obs.one)).toEqual(true);
      expect(isReactive(obs.one.two)).toEqual(true);
      expect(isReactive(obs.one.two.string)).toEqual(false);
    });

    it('calls "onGet" hook', () => {
      let counter = 0;
      const keyArray = [];
      const valueArray = [];
      const object = { one: { two: { string: 'hello' } } };
      const obs = Reactive(object, {
        deep: true,
        onGet: ({ target, key }) => {
          counter += 1;
          keyArray.push(key);
          valueArray.push(target[key]);
        },
      });

      expect(counter).toEqual(0);
      expect(obs.one.two.string).toEqual('hello');
      expect(counter).toEqual(3);
      expect(keyArray).toEqual(['one', 'two', 'string']);
      expect(valueArray).toEqual([{ two: { string: 'hello' } }, { string: 'hello' }, 'hello']);
    });

    it('calls "onSet" hook', () => {
      let counter = 0;
      const keyArray = [];
      const valueArray = [];
      const object = { one: { two: { string: 'hello' } } };
      const obs = Reactive<any>(object, {
        deep: true,
        onSet: ({ key, value }) => {
          counter += 1;
          keyArray.push(key);
          valueArray.push(value);
        },
      });

      expect(counter).toEqual(0);
      obs.one.two.string = 'hello world';
      obs.one = {};
      obs.one.foobar = 'baz';
      expect(obs.one.foobar).toEqual('baz');
      expect(obs.two).toBeUndefined();
      expect(counter).toEqual(3);
      expect(keyArray).toEqual(['string', 'one', 'foobar']);
      expect(valueArray).toEqual(['hello world', { foobar: 'baz' }, 'baz']);
    });
  });

  describe('onDelete callback', () => {
    it('calls onDelete when property is deleted', () => {
      let deleteCount = 0;
      let deletedKey = null;
      const obj = { a: 1, b: 2 };
      const state = Reactive<{ a?: number, b?: number }>(obj, {
        onDelete: ({ key }) => {
          deleteCount += 1;
          deletedKey = key;
        },
      });

      delete state.a;

      expect(deleteCount).toBe(1);
      expect(deletedKey).toBe('a');
      expect(state.a).toBeUndefined();
    });

    it('provides keysChanged flag in onDelete', () => {
      let keysChanged = false;
      const obj = { a: 1 };
      const state = Reactive<{ a?: number }>(obj, {
        onDelete: (opts) => {
          keysChanged = opts.keysChanged;
        },
      });

      delete state.a;

      expect(keysChanged).toBe(true);
    });
  });

  describe('onHas callback', () => {
    it('calls onHas when checking property existence with "in"', () => {
      let hasCount = 0;
      const obj = { a: 1 };
      const state = Reactive(obj, {
        onHas: () => {
          hasCount += 1;
        },
      });

      expect('a' in state).toBe(true);
      expect(hasCount).toBe(1);

      expect('b' in state).toBe(false);
      expect(hasCount).toBe(2);
    });

    it('calls onHas when using Object.keys', () => {
      let hasCount = 0;
      const obj = { a: 1, b: 2 };
      const state = Reactive(obj, {
        onHas: () => {
          hasCount += 1;
        },
      });

      const keys = Object.keys(state);

      expect(keys).toEqual(['a', 'b']);
      expect(hasCount).toBe(1);
    });
  });

  describe('custom needsProxy', () => {
    it('allows custom needsProxy function to prevent proxying', () => {
      const obj = {
        shouldProxy: { value: 1 },
        shouldNotProxy: { value: 2 },
      };
      const state = Reactive(obj, {
        deep: true,
        needsProxy: ({ key }) => key !== 'shouldNotProxy',
      });

      expect(isReactive(state.shouldProxy)).toBe(true);
      expect(isReactive(state.shouldNotProxy)).toBe(false);
    });

    it('needsProxy receives target, key, and value', () => {
      let receivedTarget = null;
      let receivedKey = null;
      let receivedValue = null;
      const nested = { inner: true };
      const obj = { nested };
      const state = Reactive(obj, {
        deep: true,
        needsProxy: ({ target, key, value }) => {
          receivedTarget = target;
          receivedKey = key;
          receivedValue = value;
          return true;
        },
      });

      // Trigger the needsProxy check by accessing nested
      expect(state.nested).toBeDefined();
      expect(receivedTarget).toBe(obj);
      expect(receivedKey).toBe('nested');
      expect(receivedValue).toBe(nested);
    });
  });

  describe('symbols as keys', () => {
    it('tracks symbol keys', () => {
      const sym = Symbol('test');
      const obj = { [sym]: 'value' };
      const state = Reactive(obj);

      expect(state[sym]).toBe('value');
    });

    it('notifies observers when symbol key changes', () => {
      const sym = Symbol('test');
      const obj = { [sym]: 1 };
      const state = Reactive(obj);

      expect(state[sym]).toBe(1);
      state[sym] = 2;
      expect(state[sym]).toBe(2);
    });

    it('handles well-known symbols correctly', () => {
      const obj = {
        [Symbol.toStringTag]: 'CustomObject',
      };
      const state = Reactive(obj);

      expect(state[Symbol.toStringTag]).toBe('CustomObject');
      expect(Object.prototype.toString.call(state)).toBe('[object CustomObject]');
    });
  });

  describe('frozen and sealed objects', () => {
    it('does not deeply proxy frozen objects due to non-configurable properties', () => {
      const frozen = Object.freeze({ value: 1 });
      const state = Reactive({ data: frozen });

      // Frozen object's properties are not configurable, so deep proxying is prevented
      // The frozen object itself is returned (not proxied further)
      expect(isReactive(state)).toBe(true);
      expect(state.data.value).toBe(1);
    });

    it('does not deeply proxy sealed objects due to non-configurable properties', () => {
      const sealed = Object.seal({ value: 1 });
      const state = Reactive({ data: sealed });

      // Sealed object's properties are not configurable, so deep proxying is prevented
      expect(isReactive(state)).toBe(true);
      expect(state.data.value).toBe(1);
    });

    it('handles objects with non-configurable properties', () => {
      const obj = {};

      Object.defineProperty(obj, 'fixed', {
        value: 42,
        configurable: false,
        enumerable: true,
      });

      const state = Reactive({ data: obj });

      // Non-configurable property should return raw value
      expect(state.data.fixed).toBe(42);
    });
  });

  describe('shallow reactivity (deep: false)', () => {
    it('does not proxy nested objects when deep is false', () => {
      const nested = { inner: 1 };
      const obj = { nested };
      const state = Reactive(obj, { deep: false });

      expect(isReactive(state)).toBe(true);
      expect(isReactive(state.nested)).toBe(false);
      expect(state.nested).toBe(nested);
    });

    it('still tracks top-level property changes with onSet', () => {
      let setCount = 0;
      const obj = { value: 1 };
      const state = Reactive(obj, {
        deep: false,
        onSet: () => {
          setCount += 1;
        },
      });

      state.value = 2;
      expect(setCount).toBe(1);
      expect(state.value).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('handles null prototype objects', () => {
      const nullProto = Object.create(null);

      nullProto.key = 'value';

      const state = Reactive(nullProto);

      expect(state.key).toBe('value');
      expect(isReactive(state)).toBe(true);
    });

    it('handles objects with getters', () => {
      let computeCount = 0;
      const obj = {
        _value: 1,
        get computed() {
          computeCount += 1;
          return this._value * 2;
        },
      };
      const state = Reactive(obj);

      expect(state.computed).toBe(2);
      expect(computeCount).toBe(1);
      state._value = 5;
      expect(state.computed).toBe(10);
      expect(computeCount).toBe(2);
    });

    it('handles objects with setters', () => {
      const obj = {
        _value: 1,
        get value() {
          return this._value;
        },
        set value(v) {
          this._value = v * 2;
        },
      };
      const state = Reactive(obj);

      state.value = 5;
      expect(state._value).toBe(10);
      expect(state.value).toBe(10);
    });

    it('handles circular references', () => {
      const obj: { self?: object, value: number } = { value: 1 };

      obj.self = obj;

      const state = Reactive(obj);

      expect(state.value).toBe(1);
      expect(state.self).toBe(state);
      expect((state.self as typeof obj).value).toBe(1);
    });

    it('preserves array methods on reactive arrays', () => {
      const arr = [1, 2, 3];
      const state = Reactive({ arr });

      expect(state.arr.map((x) => x * 2)).toEqual([2, 4, 6]);
      expect(state.arr.filter((x) => x > 1)).toEqual([2, 3]);
      expect(state.arr.reduce((sum, x) => sum + x, 0)).toBe(6);
    });
  });
});
