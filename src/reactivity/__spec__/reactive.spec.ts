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
});
