import Madrone from '../../Madrone';

describe('Model', () => {
  describe('custom features', () => {
    it('can make models with custom plugins', () => {
      const model = Madrone.Model.create({
        $options: { foo: [1, 2, 3] },
      })
        .extend({
          $options: { foo: [4, 5, 6] },
        })
        .withPlugins({
          name: 'foo',
          mix: (toMix) => toMix.flat(),
        });

      expect(model.options.foo).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('plugins can be scoped to individual models', () => {
      const model = Madrone.Model.create({
        $options: { foo: [1, 2, 3] },
      })
        .extend({
          $options: { foo: [4, 5, 6] },
        })
        .withPlugins({
          name: 'foo',
          mix: (toMix) => toMix.flat(),
        });
      const model2 = Madrone.Model.create({
        $options: { foo: [1, 2, 3] },
      })
        .extend({
          $options: { foo: [4, 5, 6] },
        })

      expect(model.options.foo).toEqual([1, 2, 3, 4, 5, 6]);
      expect(model2.options.foo).toEqual([4, 5, 6]);
    });
  });
});
