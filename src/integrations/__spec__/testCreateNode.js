import Madrone from '../../index';

export default function testData(name, integration) {
  beforeAll(() => {
    Madrone.use(integration);
  });
  afterAll(() => {
    Madrone.unuse(integration);
  });

  describe('basic "Madrone.create" usage', () => {
    it('creates from object', () => {
      const model = Madrone.Model.create({
        foo: null,
        bar: null,
      });
      const instance = model.create({ foo: 'foo', bar: 'bar' });

      expect(instance.foo).toEqual('foo');
      expect(instance.bar).toEqual('bar');
    });

    it('creates from object multiple times (with cache)', () => {
      const model = Madrone.Model.create({
        foo: null,
        bar: null,
      });

      const instance = model.create({ foo: 'foo', bar: 'bar' });
      const instance2 = model.create({ foo: 'foo1', bar: 'bar1' });

      expect(instance.foo).toEqual('foo');
      expect(instance.bar).toEqual('bar');
      expect(instance2.foo).toEqual('foo1');
      expect(instance2.bar).toEqual('bar1');
    });
  });

  describe('basic "$createNode" usage', () => {
    it('creates from object', () => {
      const model = Madrone.Model.create({ foo: null, bar: null });
      const instance = model.create().$createNode(model, { foo: 'foo', bar: 'bar' });

      expect(instance.foo).toEqual('foo');
      expect(instance.bar).toEqual('bar');
    });

    it('creates from class with static "create" method', () => {
      class TestClass {
        static create(data) {
          return new TestClass(data);
        }

        constructor({ foo, bar }) {
          this.foo = foo;
          this.bar = bar;
          this.itWorked = true;
        }
      }

      const model = Madrone.Model.create({});
      const instance = model.create().$createNode(TestClass, { foo: 'foo', bar: 'bar' });

      expect(instance.foo).toEqual('foo');
      expect(instance.bar).toEqual('bar');
      expect(instance.itWorked).toEqual(true);
    });
  });
}
