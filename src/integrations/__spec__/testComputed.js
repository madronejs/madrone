import lodashSet from 'lodash/set';
import Madrone from '../../index';

export default function testComputed(name, integration) {
  beforeAll(() => {
    Madrone.use(integration);
  });
  afterAll(() => {
    Madrone.unuse(integration);
  });

  describe('basic computed usage', () => {
    it('adds a property', () => {
      const model = Madrone.Model.create({
        get test() {
          return 'value';
        },
      });
      const instance = model.create();

      expect(instance.test).toEqual('value');
    });

    it('can have a non-cached computed', () => {
      let count = 0;
      const model = Madrone.Model.create({
        $options: {
          computed: {
            test: {
              cache: false,
              get() {
                count += 1;
  
                return 'value';
              },
            },
          },
        }
      });
      const instance = model.create();

      expect(instance.test).toEqual('value');
      expect(instance.test).toEqual('value');
      expect(instance.test).toEqual('value');
      expect(count).toEqual(3);
    });

    it('can have a non-cached computed via "getters"', () => {
      let count = 0;
      const model = Madrone.Model.create({
        $init() {
          Object.defineProperty(this, 'test', {
            get() {
              count += 1;

              return 'value';
            },
          });
        },
      });
      const instance = model.create();

      expect(instance.test).toEqual('value');
      expect(instance.test).toEqual('value');
      expect(instance.test).toEqual('value');
      expect(count).toEqual(3);
    });

    it('caches a non-reactive string property', () => {
      let count = 0;
      const model = Madrone.Model.create({
        get test() {
          count += 1;

          return 'value';
        },
      });
      const instance = model.create();

      expect(instance.test).toEqual('value');
      expect(instance.test).toEqual('value');
      expect(instance.test).toEqual('value');
      expect(count).toEqual(1);
    });

    it('caches a reactive string property', () => {
      let count = 0;
      const model = Madrone.Model.create({
        value: 'value',
        get test() {
          count += 1;

          return this.value;
        },
      });
      const instance = model.create();

      expect(instance.test).toEqual('value');
      expect(instance.test).toEqual('value');
      expect(instance.test).toEqual('value');
      expect(count).toEqual(1);
    });

    it('can have a custom setter', () => {
      let count = 0;
      const model = Madrone.Model.create({
        value: 'value',
        get test() {
          count += 1;

          return this.value;
        },
        set test(val) {
          this.value = val;
        },
      });
      const instance = model.create();

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
      const model = Madrone.Model.create({
        value: 'value',
        get test() {
          count += 1;

          return this.value;
        },
      });
      const instance = model.create();

      expect(instance.test).toEqual('value');
      expect(count).toEqual(1);
      instance.value = 'value2';
      expect(instance.test).toEqual('value2');
      expect(count).toEqual(2);
    });

    it('busts the cache of a nested reactive string property', () => {
      let count = 0;
      const model = Madrone.Model.create({
        value: { level1: { level2: { value: 'value' } } },
        get test() {
          count += 1;

          return this.value.level1.level2.value;
        },
      });
      const instance = model.create();

      expect(instance.test).toEqual('value');
      expect(count).toEqual(1);
      instance.value.level1.level2.value = 'value2';
      expect(instance.test).toEqual('value2');
      expect(count).toEqual(2);
    });

    it('busts the cache of an object with dynamic keys', () => {
      let count = 0;
      const model = Madrone.Model.create({
        value: {},
        get test() {
          count += 1;

          return Object.keys(this.value);
        },
      });
      const instance = model.create();

      expect(instance.test).toEqual([]);
      expect(count).toEqual(1);
      lodashSet(instance, 'value.key1', true);
      expect(instance.test).toEqual(['key1']);
      expect(count).toEqual(2);
    });

    it('busts the cache of a reactive array property', () => {
      let count = 0;
      const model = Madrone.Model.create({
        value: [],
        get test() {
          count += 1;

          return this.value;
        },
      });
      const instance = model.create();

      expect(instance.test).toEqual([]);
      expect(count).toEqual(1);
      instance.value.push('one');
      expect(instance.test).toEqual(['one']);
      expect(count).toEqual(2);
    });

    it('busts cache in a computed containing two unrelated nodes', () => {
      let count = 0;
      const obj1 = Madrone.Model.create({ value: 'hello' }).create();
      const obj2 = Madrone.Model.create({ value: 'world' }).create();
      const objCobmine = Madrone.Model.create({
        get test() {
          count += 1;

          return `${obj1.value} ${obj2.value}`;
        },
      }).create();

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

    xit('busts the cache of a reactive Set property', () => {
      let count = 0;
      const model = Madrone.Model.create({
        value: new Set(),
        get test() {
          count += 1;

          return Array.from(this.value);
        },
      });
      const instance = model.create();

      expect(instance.test).toEqual([]);
      expect(count).toEqual(1);
      instance.value.add('one');
      expect(instance.test).toEqual(['one']);
      expect(count).toEqual(2);
    });
  });
}
