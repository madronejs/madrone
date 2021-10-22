import lodashSet from 'lodash/set';
import Madrone from '../../index';

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
          describe: {
            test: { cache: false },
          },
        }
      );

      expect(instance.test).toEqual('value');
      expect(instance.test).toEqual('value');
      expect(instance.test).toEqual('value');
      expect(count).toEqual(3);
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
}
