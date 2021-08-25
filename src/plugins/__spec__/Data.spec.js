import Madrone from '../Madrone';

describe('Data', () => {
  describe('object properties', () => {
    it('can make an instance from a basic model', () => {
      const model = Madrone.Model.create({ bar: 'hello' })
      const instance = model.create();

      expect(instance.bar).toEqual('hello');
    });

    it('can set data on an instance from a basic model', () => {
      const model = Madrone.Model.create({ bar: 'hello' });
      const instance = model.create({ bar: 'world' });

      expect(instance.bar).toEqual('world');
    });

    it('deep clones data so instances do not overwrite other instance data', () => {
      const model = Madrone.Model.create({ bar: { baz: 'hello' } });
      const instance = model.create();

      instance.bar.baz = 'world';

      const instance2 = model.create();

      expect(instance2.bar.baz).toEqual('hello');
    });
  });

  describe('$options', () => {
    it('can make an instance from model defined in $options', () => {
      const model = Madrone.Model.create({
        $options: {
          data: () => ({ bar: 'hello'}),
        },
      });
      const instance = model.create();

      expect(instance.bar).toEqual('hello');
    });

    it('top level properties override $options', () => {
      const model = Madrone.Model.create({
        $options: {
          data: () => ({ bar: 'hello' }),
        },

        bar: 'world',
        foo: 'test',
      });
      const instance = model.create();

      expect(instance.bar).toEqual('world');
      expect(instance.foo).toEqual('test');
    });

    it('gets properties from extended model', () => {
      const model = Madrone.Model.create({
        $options: {
          data: () => ({ bar: 'hello'}),
        },
        test: '123',
      }).extend({
        $options: {
          data: () => ({ boo: 'world' }),
        },
        baz: true,
      });

      const instance = model.create();

      expect(instance.baz).toEqual(true);
      expect(instance.test).toEqual('123');
      expect(instance.bar).toEqual('hello');
      expect(instance.boo).toEqual('world');
    });
  });
});