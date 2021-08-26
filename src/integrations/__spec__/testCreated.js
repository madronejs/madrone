import Madrone from '../../index';

export default function testCreate(name, integration) {
  Madrone.use(integration);

  describe('basic "created" usage', () => {
    it('calls created after data is set', () => {
      const data = {};
      const model = Madrone.Model.create({
        $options: {
          data() {
            return {
              foo: null,
              bar: null,
            };
          },

          created() {
            data.foo = this.foo;
            data.bar = this.bar;
          },
        },
      });

      model.create({ foo: 'foo', bar: 'bar' });

      expect(data.foo).toEqual('foo');
      expect(data.bar).toEqual('bar');
    });

    it('can override default initialization behavior with $init in object model', () => {
      const model = Madrone.Model.create({
        foo: null,
        bar: null,

        $init(dt) {
          this.foo = dt.foo;
        },
      });

      const instance = model.create({ foo: 'foo', bar: 'bar' });

      expect(instance.foo).toEqual('foo');
      expect(instance.bar).toEqual(null);
    });

    it('can override default initialization behavior with regular model', () => {
      const model = Madrone.Model.create({
        $options: {
          data() {
            return {
              foo: null,
              bar: null,
            };
          },

          methods: {
            $init(dt) {
              this.foo = dt.foo;
            },
          },
        },
      });

      const instance = model.create({ foo: 'foo', bar: 'bar' });

      expect(instance.foo).toEqual('foo');
      expect(instance.bar).toEqual(null);
    });

    it('can use created hook defined in $options', () => {
      const timeline = [];
      const model = Madrone.Model.create({
        $options: {
          created() {
            timeline.push('created');
          },
        },
      });

      model.create();

      expect(timeline).toEqual(['created']);
    });
  });
}
