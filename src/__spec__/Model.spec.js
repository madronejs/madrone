import Madrone from '../Madrone';

const somethingElse = {
  hello: 'world',
  world: 'true'
};

const instance = Object.create(somethingElse)


describe('Model', () => {
  describe('custom features', () => {
    it('can make models', () => {
      const model = Madrone.Model.create({
        bar: 'hello'
      }, {
        foo: true
      }).extend({
        baz: true,
        greet() {
          return this.baz + this.foo + this.hello;
        }
      });

      const instance = model.create();

      //   .withOptions({ foo: [1, 2, 3] }, { foo: [4, 5, 6] })
      //   .withPlugins({
      //     name: 'foo',
      //     mix: (toMix) => toMix.flat(),
      //     install: (ctx, values) => {
      //       ctx.foo = values;
      //     }
      //   });

      // expect(model.mixed.foo).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });
});