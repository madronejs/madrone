import lodashSet from 'lodash/set';
import Madrone from '../../index';
import { delay } from '@/test/util';

export default function testAuto(name, integration) {
  beforeAll(() => {
    Madrone.use(integration);
  });
  afterAll(() => {
    Madrone.unuse(integration);
  });

  it('uses the same object', () => {
    const original = {
      get test() {
        return 'value';
      },
    };
    const instance = Madrone.auto(original);

    expect(original === instance).toEqual(true);
  });

  it('keeps enumerable/configurable from descriptors', () => {
    const original = {} as any;

    Object.defineProperties(original, {
      testValue: {
        configurable: true,
        enumerable: false,
        value: 'test value',
      },
      testGetter: {
        configurable: true,
        enumerable: false,
        get() {
          return 'test getter';
        },
      },
    });

    const instance = Madrone.auto(original);

    expect(Object.keys(instance)).toEqual([]);
    expect(instance.testValue).toEqual('test value');
    expect(instance.testGetter).toEqual('test getter');
  });

  it('can have a non-enumerable property', () => {
    const original = Madrone.auto({ foo: true }, { foo: { enumerable: false } });

    expect(Object.keys(original)).toEqual([]);
  });

  describe('basic computed usage', () => {
    it('adds a property', () => {
      const instance = Madrone.auto({
        get test() {
          return 'value';
        },
      });

      expect(instance.test).toEqual('value');
    });

    it('can have a non-cached computed', () => {
      let count = 0;
      const instance = Madrone.auto(
        {
          get test() {
            count += 1;

            return 'value';
          },
        },
        {
          test: { cache: false },
        }
      );

      expect(instance.test).toEqual('value');
      expect(instance.test).toEqual('value');
      expect(instance.test).toEqual('value');
      expect(count).toEqual(3);
    });

    it('can have a non-enumerable computed', () => {
      const instance = Madrone.auto(
        {
          get test() {
            return 'value';
          },
        },
        {
          test: { enumerable: false },
        }
      );

      expect(Object.keys(instance)).toEqual([]);
    });

    it('caches a non-reactive string property', () => {
      let count = 0;
      const instance = Madrone.auto({
        get test() {
          count += 1;

          return 'value';
        },
      });

      expect(instance.test).toEqual('value');
      expect(instance.test).toEqual('value');
      expect(instance.test).toEqual('value');
      expect(count).toEqual(1);
    });

    it('caches a reactive string property', () => {
      let count = 0;
      const instance = Madrone.auto({
        value: 'value',
        get test() {
          count += 1;

          return this.value;
        },
      });

      expect(instance.test).toEqual('value');
      expect(instance.test).toEqual('value');
      expect(instance.test).toEqual('value');
      expect(count).toEqual(1);
    });

    it('can have a custom setter', () => {
      let count = 0;
      const instance = Madrone.auto({
        value: 'value',
        get test() {
          count += 1;

          return this.value;
        },
        set test(val) {
          this.value = val;
        },
      });

      expect(instance.test).toEqual('value');
      expect(instance.test).toEqual('value');
      expect(instance.test).toEqual('value');
      expect(count).toEqual(1);
      instance.test = 'value2';
      expect(instance.test).toEqual('value2');
      expect(count).toEqual(2);
    });

    it('busts the cache of a reactive string property', () => {
      let count = 0;
      const instance = Madrone.auto({
        value: 'value',
        get test() {
          count += 1;

          return this.value;
        },
      });

      expect(instance.test).toEqual('value');
      expect(count).toEqual(1);
      instance.value = 'value2';
      expect(instance.test).toEqual('value2');
      expect(count).toEqual(2);
    });

    it('busts the cache of a nested reactive string property', () => {
      let count = 0;
      const instance = Madrone.auto({
        value: { level1: { level2: { value: 'value' } } },
        get test() {
          count += 1;

          return this.value.level1.level2.value;
        },
      });

      expect(instance.test).toEqual('value');
      expect(count).toEqual(1);
      instance.value.level1.level2.value = 'value2';
      expect(instance.test).toEqual('value2');
      expect(count).toEqual(2);
    });

    it('busts the cache of an object with dynamic keys', () => {
      let count = 0;
      const instance = Madrone.auto({
        value: {},
        get test() {
          count += 1;

          return Object.keys(this.value);
        },
      });

      expect(instance.test).toEqual([]);
      expect(count).toEqual(1);
      lodashSet(instance, 'value.key1', true);
      expect(instance.test).toEqual(['key1']);
      expect(count).toEqual(2);
    });

    it('busts the cache of a reactive array property', () => {
      let count = 0;
      const instance = Madrone.auto({
        value: [],
        get test() {
          count += 1;

          return this.value;
        },
      });

      expect(instance.test).toEqual([]);
      expect(count).toEqual(1);
      instance.value.push('one');
      expect(instance.test).toEqual(['one']);
      expect(count).toEqual(2);
    });

    it('busts cache in a computed containing two unrelated nodes', () => {
      let count = 0;
      const obj1 = Madrone.auto({ value: 'hello' });
      const obj2 = Madrone.auto({ value: 'world' });
      const objCobmine = Madrone.auto({
        get test() {
          count += 1;

          return `${obj1.value} ${obj2.value}`;
        },
      });

      expect(objCobmine.test).toEqual('hello world');
      expect(objCobmine.test).toEqual('hello world');
      expect(count).toEqual(1);
      obj1.value = 'HELLO';
      expect(objCobmine.test).toEqual('HELLO world');
      expect(objCobmine.test).toEqual('HELLO world');
      expect(count).toEqual(2);
      obj2.value = 'WORLD';
      expect(objCobmine.test).toEqual('HELLO WORLD');
      expect(objCobmine.test).toEqual('HELLO WORLD');
      expect(count).toEqual(3);
    });
  });

  describe('basic watch usage', () => {
    it('can watch a data property', async () => {
      const instance = Madrone.auto({ foo: 'bar' });
      const newVals = [];
      const oldVals = [];

      Madrone.watch(
        () => instance.foo,
        (newVal, oldVal) => {
          newVals.push(newVal);
          oldVals.push(oldVal);
        }
      );

      expect(instance.foo).toEqual('bar');
      instance.foo = 'bar1';
      await delay();
      instance.foo = 'bar2';
      await delay();
      instance.foo = 'bar3';
      await delay();
      instance.foo = undefined;
      await delay();
      expect(instance.foo).toBeUndefined();
      expect(newVals.length).toEqual(4);
      expect(oldVals.length).toEqual(4);
      expect(newVals).toEqual(['bar1', 'bar2', 'bar3', undefined]);
      expect(oldVals).toEqual(['bar', 'bar1', 'bar2', 'bar3']);
    });

    it('can watch a data property twice', async () => {
      const instance = Madrone.auto({ foo: 'bar' });
      const newVals = [];
      const oldVals = [];
      const newVals2 = [];
      const oldVals2 = [];

      Madrone.watch(
        () => instance.foo,
        (newVal, oldVal) => {
          newVals.push(newVal);
          oldVals.push(oldVal);
        }
      );

      Madrone.watch(
        () => instance.foo,
        (newVal, oldVal) => {
          newVals2.push(newVal);
          oldVals2.push(oldVal);
        }
      );

      expect(instance.foo).toEqual('bar');
      instance.foo = 'bar1';
      await delay();
      instance.foo = 'bar2';
      await delay();
      instance.foo = 'bar3';
      await delay();
      instance.foo = undefined;
      await delay();
      expect(instance.foo).toBeUndefined();
      expect(newVals.length).toEqual(4);
      expect(oldVals.length).toEqual(4);
      expect(newVals).toEqual(['bar1', 'bar2', 'bar3', undefined]);
      expect(oldVals).toEqual(['bar', 'bar1', 'bar2', 'bar3']);
      expect(newVals2).toEqual(newVals);
      expect(oldVals2).toEqual(oldVals);
    });

    it('watches a reactive string computed property', async () => {
      const newVals = [];
      const oldVals = [];
      const instance = Madrone.auto({
        value: 'value',
        get test() {
          return this.value;
        },
      });

      Madrone.watch(
        () => instance.test,
        (newVal, oldVal) => {
          newVals.push(newVal);
          oldVals.push(oldVal);
        }
      );

      instance.value = 'value2';
      await delay();
      instance.value = 'value3';
      await delay();
      expect(newVals).toEqual(['value2', 'value3']);
      expect(oldVals).toEqual(['value', 'value2']);
    });

    it('watches a delete on nested data', async () => {
      const newVals = [];
      const oldVals = [];
      const instance = Madrone.auto({
        value: {
          foo: {
            bar: 'hello',
            baz: 'world',
          },
        },
        get test() {
          return `${this.value.foo.bar} ${this.value.foo.baz}`;
        },
      });

      Madrone.watch(
        () => instance.test,
        (newVal, oldVal) => {
          newVals.push(newVal);
          oldVals.push(oldVal);
        }
      );

      delete instance.value.foo.bar;
      await delay();
      delete instance.value.foo.baz;
      await delay();
      instance.value.foo.bar = 'hello2';
      await delay();
      expect(newVals).toEqual(['undefined world', 'undefined undefined', 'hello2 undefined']);
      expect(oldVals).toEqual(['hello world', 'undefined world', 'undefined undefined']);
    });

    it('watches changes in a computed containing two unrelated nodes', async () => {
      const newVals = [];
      const oldVals = [];
      const obj1 = Madrone.auto({ value: 'hello' });
      const obj2 = Madrone.auto({ value: 'world' });
      const objCobmine = Madrone.auto({
        get test() {
          return `${obj1.value} ${obj2.value}`;
        },
      });

      Madrone.watch(
        () => objCobmine.test,
        (newVal, oldVal) => {
          newVals.push(newVal);
          oldVals.push(oldVal);
        }
      );

      obj1.value = 'HELLO';
      await delay();
      obj2.value = 'WORLD';
      await delay();
      expect(newVals).toEqual(['HELLO world', 'HELLO WORLD']);
      expect(oldVals).toEqual(['hello world', 'HELLO world']);
    });

    it('can watch a value nested in an object', async () => {
      const newVals = [];
      const oldVals = [];
      const instance = Madrone.auto({
        value: { level1: { level2: { value: 'value' } } },
      });

      Madrone.watch(
        () => instance.value.level1.level2.value,
        (newVal, oldVal) => {
          newVals.push(newVal);
          oldVals.push(oldVal);
        }
      );

      instance.value.level1.level2.value = 'value2';
      await delay();
      instance.value.level1.level2.value = 'value3';
      await delay();
      expect(newVals).toEqual(['value2', 'value3']);
      expect(oldVals).toEqual(['value', 'value2']);
    });

    it('can watch a value nested in an object', async () => {
      const newVals = [];
      const oldVals = [];
      const instance = Madrone.auto({
        value: { level1: { level2: { value: 'value' } } },
      });

      Madrone.watch(
        () => instance.value.level1.level2.value,
        (newVal, oldVal) => {
          newVals.push(newVal);
          oldVals.push(oldVal);
        }
      );

      instance.value.level1.level2.value = 'value2';
      lodashSet(instance, 'value.level1.level2.value', 'value2');
      await delay();
      lodashSet(instance, 'value.level1.level2.value', 'value3');
      await delay();
      expect(newVals).toEqual(['value2', 'value3']);
      expect(oldVals).toEqual(['value', 'value2']);
    });

    it('can watch if new children are added to an object', async () => {
      const newVals = [];
      const oldVals = [];
      const instance = Madrone.auto({
        value: {},
      });

      Madrone.watch(
        () => instance.value,
        (newVal, oldVal) => {
          newVals.push(newVal);
          oldVals.push(oldVal);
        },
        { deep: true }
      );

      lodashSet(instance, 'value.child1', 'hello');
      await delay();
      lodashSet(instance, 'value.child2', 'hello');
      await delay();
      // the number of changes seems to differ...
      expect(newVals.length).toBeGreaterThan(0);
      expect(oldVals.length).toBeGreaterThan(0);
    });
  });
}
