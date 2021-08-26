import Madrone from '../../index';

function testModel(model) {
  it('adds a property', () => {
    const instance = model.create();

    expect(instance.foo).toEqual('bar');
  });

  it('mutates property', () => {
    const instance = model.create();

    expect(instance.foo).toEqual('bar');
    instance.foo = 'foo';
    expect(instance.foo).toEqual('foo');
  });

  it('can delete property', () => {
    const instance = model.create();

    expect(Object.keys(instance.obj)).toEqual(['foo', 'bar', 'baz']);
    delete instance.obj.foo;
    expect(Object.keys(instance.obj)).toEqual(['bar', 'baz']);
  });

  it('can bust cache of computed when deleting a property', () => {
    const instance = model.create();

    expect(instance.objKeys).toEqual(['foo', 'bar', 'baz']);
    delete instance.obj.foo;
    expect(instance.objKeys).toEqual(['bar', 'baz']);
  });

  it('can have other reactive nodes as reactive data properties', () => {
    const instance = model.create();
    const instance2 = model.create();

    instance.obj = instance2;

    expect(instance.obj).toEqual(instance2);
  });
}

export default function testData(name, integration) {
  Madrone.use(integration);

  describe('basic data usage', () => {
    describe('with "mixVerbose"', () => {
      const model = Madrone.Model.create({
        $options: {
          data() {
            return {
              foo: 'bar',
              obj: { foo: 'foo', bar: 'bar', baz: 'baz' },
            };
          },
          computed: {
            objKeys() {
              return Object.keys(this.obj);
            },
          },
        },
      });

      testModel(model);
    });

    describe('with "mixObject"', () => {
      const model = Madrone.Model.create({
        foo: 'bar',
        obj: { foo: 'foo', bar: 'bar', baz: 'baz' },
        get objKeys() {
          return Object.keys(this.obj);
        },
      });

      testModel(model);
    });

    it('deep clones data', () => {
      const model = Madrone.Model.create({
        obj: { foo: 'foo', bar: 'bar', baz: 'baz' },
      });

      const instance1 = model.create();

      delete instance1.obj.foo;

      const instance2 = model.create();

      expect(Object.keys(instance2.obj)).toEqual(['foo', 'bar', 'baz']);
    });
  });
}
