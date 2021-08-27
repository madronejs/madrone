import Madrone from '../../index';

describe('Models', () => {
  it('adds models for $createNode', () => {
    const model1 = Madrone.Model.create({
      foo: true,
      bar: false,
    });
    const model2 = Madrone.Model.create({
      $options: {
        models: { model1 },
      },
    });

    const instance = model2.create();
    const node = instance.$createNode('model1');

    expect(node.$parent).toEqual(instance);
    expect(node.foo).toEqual(true);
    expect(node.bar).toEqual(false);
  });

  it('can override models if models have same name', () => {
    const test1 = Madrone.Model.create({
      foo: true,
      bar: true,
    });
    const test2 = Madrone.Model.create({
      foo2: false,
      bar2: false,
    });
    const model = Madrone.Model.create({
      $options: {
        models: { test: test1 },
      },
    });
    const model2 = model.extend({
      $options: {
        models: { test: test2 },
      },
    });

    const instance = model.create();
    const node = instance.$createNode('test');

    expect(node.$parent).toEqual(instance);
    expect(node.foo).toEqual(true);
    expect(node.bar).toEqual(true);
    expect(node.foo2).toBeUndefined();
    expect(node.bar2).toBeUndefined();

    const instance2 = model2.create();
    const node2 = instance2.$createNode('test');

    expect(node2.$parent).toEqual(instance2);
    expect(node2.foo).toBeUndefined();
    expect(node2.bar).toBeUndefined();
    expect(node2.foo2).toEqual(false);
    expect(node2.bar2).toEqual(false);
  });
});
