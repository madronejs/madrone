import Madrone from '../Madrone';
describe('create', () => {
  it('can create models with empty type', () => {
    const model = Madrone.Model.create();
    const instance = model.create();

    expect(Object.keys(instance)).toEqual([]);
  });
});

describe('$options', () => {
  it('object model adds extra items to $options when mixing other models', () => {
    const model = Madrone.Model.create({
      $options: {
        hello: 'testItem',
      },
    })
      .extend({
        $options: {
          world: 'testItem2',
        },
      })
      .extend({
        $options: {
          hello: 'testItemOverride',
        },
      });

    expect(model.feats).toEqual({
      hello: 'testItemOverride',
      world: 'testItem2',
    });
  });

  it('adds $options to model instance', () => {
    const model = Madrone.Model.create({ $options: { hello: 'testItem' } })
      .extend({ $options: { world: 'testItem2' } })
      .extend({ $options: { hello: 'testItemOverride' } });
    const instance = model.create();

    expect(instance.$options).toEqual({
      hello: 'testItemOverride',
      world: 'testItem2',
    });
  });

  it('keeps options that are not defined in plugins', () => {
    const model = Madrone.Model.create({
      $options: {
        foo: 'hello',
        bar: { foo: 'hello2' },
      },
    });
    const instance = model.create();

    expect(instance.$options.foo).toEqual('hello');
    expect(instance.$options.bar.foo).toEqual('hello2');
  });

  it('takes the last option if the model is extended', () => {
    const model = Madrone.Model.create({
      $options: {
        foo: 'hello',
        bar: { foo: 'hello2' },
      },
    }).extend({
      $options: {
        foo: 'world',
        bar: { foo1: 'world2' },
      },
    });
    const instance = model.create();

    expect(instance.$options.foo).toEqual('world');
    expect(instance.$options.bar.foo).toBeUndefined();
    expect(instance.$options.bar.foo1).toEqual('world2');
  });
});

describe('$init', () => {
  it('can replace value returned from Model.create with $init return', () => {
    const model = Madrone.Model.create({
      $init() {
        return { foo: true, bar: false };
      },
    });
    const instance = model.create();

    expect(instance).toEqual({ foo: true, bar: false });
    expect(Madrone.isMadrone(instance)).toEqual(false);
  });
});
