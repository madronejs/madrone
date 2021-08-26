import Madrone from '../../index';

describe('Computed', () => {
  describe('object properties', () => {
    it('can make an instance from a basic model', () => {
      const model = Madrone.Model.create({
        get bar() {
          return 'hello';
        },
      });
      const instance = model.create();

      expect(instance.bar).toEqual('hello');
    });

    it('can have setters', () => {
      const model = Madrone.Model.create({
        get bar() {
          return this.dynamic;
        },
        set bar(val) {
          this.dynamic = val;
        }
      });
      const instance = model.create();

      expect(instance.bar).toBeUndefined();
      instance.bar = 'hello';
      expect(instance.bar).toEqual('hello')
    });

    it('can set data on an instance from a basic model', () => {
      const model = Madrone.Model.create({
        _bar: undefined,
        get bar() {
          return this._bar;
        },
        set bar(val) {
          this._bar = val;
        },
      });
      const instance = model.create({ bar: 'world' });

      expect(instance.bar).toEqual('world');
    });
  });

  describe('$options', () => {
    it('can make a computed from model defined in $options', () => {
      const model = Madrone.Model.create({
        $options: {
          computed: {
            bar() {
              return 'hello';
            },
          },
        },
      });
      const instance = model.create();

      expect(instance.bar).toEqual('hello');
    });

    it('top level computeds override $options', () => {
      const model = Madrone.Model.create({
        $options: {
          computed: {
            bar() {
              return 'hello';
            },
          },
        },

        get bar() {
          return 'world';
        },

        get foo() {
          return 'test';
        },
      });

      const instance = model.create();

      expect(instance.bar).toEqual('world');
      expect(instance.foo).toEqual('test');
    });

    it('gets properties from extended model', () => {
      const model = Madrone.Model.create({
        $options: {
          computed: {
            bar() {
              return 'hello';
            },
          },
        },

        get overrideMe() {
          return false;
        },

        get test() {
          return '123';
        },
      }).extend({
        $options: {
          computed: {
            boo() {
              return 'world';
            },
          },
        },
        get overrideMe() {
          return true;
        },
        get baz() {
          return true;
        },
      });

      const instance = model.create();

      expect(instance.baz).toEqual(true);
      expect(instance.test).toEqual('123');
      expect(instance.bar).toEqual('hello');
      expect(instance.boo).toEqual('world');
      expect(instance.overrideMe).toEqual(true);
    });

    it('only has keys from defined methods', () => {
      const model = Madrone.Model.create({
        $options: {
          computed: {
            get first() {
              return 1;
            },
          },
        },
      }).extend({
        $options: {
          computed: {
            get second() {
              return 2;
            },
          },
        },
        get third() {
          return 3;
        },
      });

      const instance = model.create();

      expect(Object.keys(instance)).toEqual(['first', 'second', 'third']);
    });
  });
});