import Madrone from '../index';

describe('create', () => {
  it('can create models with empty type', () => {
    const model = Madrone.Model.create();
    const instance = model.create();

    expect(Object.keys(instance)).toEqual([]);
  });

  it('can create instances of models with default data', () => {
    const model = Madrone.Model.create({ foo: false });
    const instance = model.create({ foo: true });

    expect(instance.foo).toEqual(true);
  });
});

describe('extend', () => {
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

    expect(model.options).toEqual({
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

  describe('extend models with other models', () => {
    const model = Madrone.Model.create({
      foo: true,
      get bar() {
        return this.foo;
      },
    });
    const model2 = Madrone.Model.create({
      foo: false,
      boo: '123',
      get baz() {
        return 'hello';
      },
    });
    const model3 = model.extend(model2.type);

    it('has the correct keys', () => {
      const instance1 = model.create();
      const instance2 = model2.create();
      const instance3 = model3.create();

      expect(Object.keys(instance1)).toEqual(['foo', 'bar']);
      expect(Object.keys(instance2)).toEqual(['foo', 'boo', 'baz']);
      expect(Object.keys(instance3)).toEqual(['foo', 'boo', 'bar', 'baz']);
    });

    it('has the correct default data', () => {
      const instance1 = model.create();
      const instance2 = model2.create();
      const instance3 = model3.create();

      expect(instance1.foo).toEqual(true);
      expect(instance1.bar).toEqual(true);
      expect(instance1.boo).toBeUndefined();

      expect(instance2.foo).toEqual(false);
      expect(instance2.boo).toEqual('123');
      expect(instance2.baz).toEqual('hello');

      expect(instance3.foo).toEqual(false);
      expect(instance3.bar).toEqual(false);
      expect(instance3.boo).toEqual('123');
      expect(instance3.baz).toEqual('hello');
    });
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

describe('Model.type', () => {
  it('has the shape and options available on "type"', () => {
    const model = Madrone.Model.create({
      foo: true,
      get bar() {
        return this.foo;
      },
    });

    expect(model.options).toEqual(model.type.$options);
    expect(model.type.$options.data).toBeDefined();
    expect(model.type.$options.computed).toBeDefined();
    expect(model.type.foo).toBeTruthy();
    expect(model.type.bar).toEqual(model.type.foo);
  });

  it('merges options', () => {
    const model = Madrone.Model.create({
      $options: {
        baz: true,
      },
      foo: true,
      get bar() {
        return this.foo;
      },
    });

    expect(model.options).toEqual(model.type.$options);
    expect(model.type.$options.data).toBeDefined();
    expect(model.type.$options.computed).toBeDefined();
    expect(model.type.foo).toEqual(true);
    expect(model.type.bar).toEqual(model.type.foo);
    expect(model.type.$options.baz).toEqual(true);
  });
});
