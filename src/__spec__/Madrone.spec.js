import Madrone from '../index';

describe('Madrone.isMadrone', () => {
  it('returns true if instance of model is Madrone', () => {
    const model = Madrone.Model.create({});
    const instance = model.create();

    expect(Madrone.isMadrone(instance)).toEqual(true);
  });

  it('returns false if instance of model is regular object', () => {
    expect(Madrone.isMadrone({})).toEqual(false);
  });
});

describe('$createNode', () => {
  it('can create instances of other models using $createNode', () => {
    const myTestModel = Madrone.Model.create({ foo: true, bar: false });
    const model = Madrone.Model.create({
      makeMyTest() {
        return this.$createNode(myTestModel, { bar: true });
      },
    });
    const instance = model.create();
    const myTestInstance = instance.makeMyTest();

    expect(Madrone.isMadrone(myTestInstance)).toEqual(true);
    expect(myTestInstance.foo).toEqual(true);
    expect(myTestInstance.bar).toEqual(true);
    expect(myTestInstance.$parent).toEqual(instance);
  });

  it('can create instances from functions that return models', () => {
    const myTestModel = Madrone.Model.create({ foo: true, bar: false });
    const model = Madrone.Model.create({
      makeMyTest() {
        return this.$createNode(() => myTestModel, { bar: true });
      },
    });
    const instance = model.create();
    const myTestInstance = instance.makeMyTest();

    expect(Madrone.isMadrone(myTestInstance)).toEqual(true);
    expect(myTestInstance.foo).toEqual(true);
    expect(myTestInstance.bar).toEqual(true);
    expect(myTestInstance.$parent).toEqual(instance);
  });

  it('removes installed plugins from $options', () => {
    const model = Madrone.Model.create({
      $options: {
        test: false,
      },
      foo: true,
      get bar() {
        return this.foo;
      },
    });
    const instance = model.create();

    expect(Object.keys(model.options)).toEqual(['test', 'computed', 'data']);
    expect(Object.keys(instance.$options)).toEqual(['test']);
  });
});
