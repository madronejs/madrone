import Madrone from '../Madrone';

describe('Model', () => {
  describe('custom features', () => {
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
});