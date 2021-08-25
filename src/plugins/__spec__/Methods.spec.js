import Madrone from '../../Madrone';

describe('Methods', () => {
  describe('object methods', () => {
    it('can make methods from a basic model', () => {
      const model = Madrone.Model.create({
        bar() {
          return 'hello';
        },
      });
      const instance = model.create();

      expect(instance.bar()).toEqual('hello');
    });

    it('has the correct "this" context', () => {
      const model = Madrone.Model.create({
        name: 'myName',
        greet() {
          return `Hello ${this.name}`;
        },
      });
      const instance = model.create();

      expect(instance.greet()).toEqual('Hello myName');
    });
  });

  describe('$options', () => {
    it('can call methods from model defined in $options', () => {
      const model = Madrone.Model.create({
        $options: {
          methods: {
            bar() {
              return 'hello';
            },
          },
        },
      });
      const instance = model.create();

      expect(instance.bar()).toEqual('hello');
    });

    it('top level properties override $options', () => {
      const model = Madrone.Model.create({
        $options: {
          methods: {
            inOpts() {
              return true;
            },
            bar() {
              return 'hello';
            },
          },
        },

        bar() {
          return 'world';
        },
        inModel() {
          return true;
        }
      });
      const instance = model.create();

      expect(instance.bar()).toEqual('world');
      expect(instance.inOpts()).toEqual(true);
      expect(instance.inModel()).toEqual(true);
    });

    it('gets methods from extended model', () => {
      const model = Madrone.Model.create({
        $options: {
          methods: {
            first() {
              return 1;
            },
          },
        },
      }).extend({
        $options: {
          methods: {
            second() {
              return 2;
            },
          },
        },
        third() {
          return 3;
        }
      });

      const instance = model.create();

      expect(instance.first()).toEqual(1);
      expect(instance.second()).toEqual(2);
      expect(instance.third()).toEqual(3);
    });
  });
});
