import lodashSet from 'lodash/set';
import Madrone from '../../index';

export default function testData(name, integration) {
  Madrone.use(integration);

  describe('basic watch usage', () => {
    it('can watch a data property', async () => {
      const model = Madrone.Model.create({ foo: 'bar' });
      const instance = model.create();
      const newVals = [];
      const oldVals = [];

      instance.$watch('foo', (newVal, oldVal) => {
        newVals.push(newVal);
        oldVals.push(oldVal);
      });

      expect(instance.foo).toEqual('bar');
      instance.foo = 'bar1';
      await new Promise(setTimeout);
      instance.foo = 'bar2';
      await new Promise(setTimeout);
      instance.foo = 'bar3';
      await new Promise(setTimeout);
      instance.foo = undefined;
      await new Promise(setTimeout);
      expect(instance.foo).toBeUndefined();
      expect(newVals.length).toEqual(4);
      expect(oldVals.length).toEqual(4);
      expect(newVals).toEqual(['bar1', 'bar2', 'bar3', undefined]);
      expect(oldVals).toEqual(['bar', 'bar1', 'bar2', 'bar3']);
    });

    it('can watch a data property twice', async () => {
      const model = Madrone.Model.create({ foo: 'bar' });
      const instance = model.create();
      const newVals = [];
      const oldVals = [];
      const newVals2 = [];
      const oldVals2 = [];

      instance.$watch('foo', (newVal, oldVal) => {
        newVals.push(newVal);
        oldVals.push(oldVal);
      });

      instance.$watch('foo', (newVal, oldVal) => {
        newVals2.push(newVal);
        oldVals2.push(oldVal);
      });

      expect(instance.foo).toEqual('bar');
      instance.foo = 'bar1';
      await new Promise(setTimeout);
      instance.foo = 'bar2';
      await new Promise(setTimeout);
      instance.foo = 'bar3';
      await new Promise(setTimeout);
      instance.foo = undefined;
      await new Promise(setTimeout);
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
      const model = Madrone.Model.create({
        value: 'value',
        get test() {
          return this.value;
        },
      });
      const instance = model.create();

      instance.$watch('test', (newVal, oldVal) => {
        newVals.push(newVal);
        oldVals.push(oldVal);
      });

      instance.value = 'value2';
      await new Promise(setTimeout);
      instance.value = 'value3';
      await new Promise(setTimeout);
      expect(newVals).toEqual(['value2', 'value3']);
      expect(oldVals).toEqual(['value', 'value2']);
    });

    it('watches a delete on nested data', async () => {
      const newVals = [];
      const oldVals = [];
      const model = Madrone.Model.create({
        value: {
          foo: {
            bar: 'hello',
            baz: 'world',
          }
        },
        get test() {
          return `${this.value.foo.bar} ${this.value.foo.baz}`;
        },
      });
      const instance = model.create();

      instance.$watch('test', (newVal, oldVal) => {
        newVals.push(newVal);
        oldVals.push(oldVal);
      });

      delete instance.value.foo.bar;
      await new Promise(setTimeout);
      delete instance.value.foo.baz;
      await new Promise(setTimeout);
      instance.value.foo.bar = 'hello2';
      await new Promise(setTimeout);
      expect(newVals).toEqual(['undefined world', 'undefined undefined', 'hello2 undefined']);
      expect(oldVals).toEqual(['hello world', 'undefined world', 'undefined undefined']);
    });

    it('watches changes in a computed containing two unrelated nodes', async () => {
      const newVals = [];
      const oldVals = [];
      const obj1 = Madrone.Model.create({ value: 'hello' }).create();
      const obj2 = Madrone.Model.create({ value: 'world' }).create();
      const objCobmine = Madrone.Model.create({
        get test() {
          return `${obj1.value} ${obj2.value}`;
        },
      }).create();

      objCobmine.$watch('test', (newVal, oldVal) => {
        newVals.push(newVal);
        oldVals.push(oldVal);
      });

      obj1.value = 'HELLO';
      await new Promise(setTimeout);
      obj2.value = 'WORLD';
      await new Promise(setTimeout);
      expect(newVals).toEqual(['HELLO world', 'HELLO WORLD']);
      expect(oldVals).toEqual(['hello world', 'HELLO world']);
    });

    it('can watch a value nested in an object', async () => {
      const newVals = [];
      const oldVals = [];
      const model = Madrone.Model.create({
        value: { level1: { level2: { value: 'value' } } },
      });
      const instance = model.create();

      instance.$watch('value.level1.level2.value', (newVal, oldVal) => {
        newVals.push(newVal);
        oldVals.push(oldVal);
      });

      instance.value.level1.level2.value = 'value2';
      await new Promise(setTimeout);
      instance.value.level1.level2.value = 'value3';
      await new Promise(setTimeout);
      expect(newVals).toEqual(['value2', 'value3']);
      expect(oldVals).toEqual(['value', 'value2']);
    });

    it('can watch a value nested in an object', async () => {
      const newVals = [];
      const oldVals = [];
      const model = Madrone.Model.create({
        value: { level1: { level2: { value: 'value' } } },
      });
      const instance = model.create();

      instance.$watch('value.level1.level2.value', (newVal, oldVal) => {
        newVals.push(newVal);
        oldVals.push(oldVal);
      });

      instance.value.level1.level2.value = 'value2';
      lodashSet(instance, 'value.level1.level2.value', 'value2');
      await new Promise(setTimeout);
      lodashSet(instance, 'value.level1.level2.value', 'value3');
      await new Promise(setTimeout);
      expect(newVals).toEqual(['value2', 'value3']);
      expect(oldVals).toEqual(['value', 'value2']);
    });

    it('can watch if new children are added to an object', async () => {
      const newVals = [];
      const oldVals = [];
      const model = Madrone.Model.create({
        value: {},
      });
      const instance = model.create();

      instance.$watch('value', {
        deep: true,
        handler: (newVal, oldVal) => {
          newVals.push(newVal);
          oldVals.push(oldVal);
        },
      });

      lodashSet(instance, 'value.child1', 'hello');
      await new Promise(setTimeout);
      lodashSet(instance, 'value.child2', 'hello');
      await new Promise(setTimeout);
      // the number of changes seems to differ...
      expect(newVals.length).toBeGreaterThan(0);
      expect(oldVals.length).toBeGreaterThan(0);
    });
  });

  describe('watch from model', () => {
    it('can watch a data property', async () => {
      const newVals = [];
      const oldVals = [];
      const model = Madrone.Model.create({
        $options: {
          data() {
            return {
              foo: 'bar',
            };
          },
          watch: {
            foo(newVal, oldVal) {
              newVals.push(newVal);
              oldVals.push(oldVal);
            },
          },
        },
      });

      const instance = model.create();

      expect(instance.foo).toEqual('bar');
      instance.foo = 'bar1';
      await new Promise(setTimeout);
      instance.foo = 'bar2';
      await new Promise(setTimeout);
      instance.foo = 'bar3';
      await new Promise(setTimeout);
      instance.foo = undefined;
      await new Promise(setTimeout);
      expect(instance.foo).toBeUndefined();
      expect(newVals.length).toEqual(4);
      expect(oldVals.length).toEqual(4);
      expect(newVals).toEqual(['bar1', 'bar2', 'bar3', undefined]);
      expect(oldVals).toEqual(['bar', 'bar1', 'bar2', 'bar3']);
    });

    it('watches a reactive string computed property', async () => {
      const newVals = [];
      const oldVals = [];
      const model = Madrone.Model.create({
        $options: {
          data() {
            return {
              value: 'value',
            };
          },
          computed: {
            test() {
              return this.value;
            },
          },
          watch: {
            test(newVal, oldVal) {
              newVals.push(newVal);
              oldVals.push(oldVal);
            },
          },
        },
      });
      const instance = model.create();

      instance.value = 'value2';
      await new Promise(setTimeout);
      instance.value = 'value3';
      await new Promise(setTimeout);
      expect(newVals).toEqual(['value2', 'value3']);
      expect(oldVals).toEqual(['value', 'value2']);
    });

    it('watches a non-cached reactive string computed property', async () => {
      const newVals = [];
      const oldVals = [];
      const model = Madrone.Model.create({
        $options: {
          data() {
            return {
              value: 'value',
            };
          },
          computed: {
            test: {
              cache: false,
              get() {
                return this.value;
              },
            },
          },
          watch: {
            test(newVal, oldVal) {
              newVals.push(newVal);
              oldVals.push(oldVal);
            },
          },
        },
      });
      const instance = model.create();

      instance.value = 'value2';
      await new Promise(setTimeout);
      instance.value = 'value3';
      await new Promise(setTimeout);
      expect(newVals).toEqual(['value2', 'value3']);
      expect(oldVals).toEqual(['value', 'value2']);
    });
  });
}
