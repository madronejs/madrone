import Madrone from '../../Madrone';
import { RelationshipsPlugin } from '../../plugins';

export default function testRelationships(name, integration) {
  Madrone.use(integration);
  Madrone.use(RelationshipsPlugin);

  describe('basic toJSON usage', () => {
    it('handles computed properties', () => {
      const instance = Madrone.Model.create({
        get emptyString() {
          return '';
        },
        get string() {
          return 'string1';
        },
      }).create();

      expect(instance.toJSON()).toEqual({ emptyString: '', string: 'string1' });
    });

    it('handles "string" data properties', () => {
      const instance = Madrone.Model.create({
        emptyString: '',
        string: 'string1',
      }).create();

      expect(instance.toJSON()).toEqual({ emptyString: '', string: 'string1' });
    });

    it('handles "number" data properties', () => {
      const instance = Madrone.Model.create({
        zero: 0,
        one: 1,
      }).create();

      expect(instance.toJSON()).toEqual({ zero: 0, one: 1 });
    });

    it('handles "boolean" data properties', () => {
      const instance = Madrone.Model.create({
        truthy: true,
        falsy: false,
      }).create();

      expect(instance.toJSON()).toEqual({ truthy: true, falsy: false });
    });

    it('handles "array" of "string" data properties', () => {
      const instance = Madrone.Model.create({
        array: ['one', 'two', ''],
      }).create();

      expect(instance.toJSON()).toEqual({ array: ['one', 'two', ''] });
    });

    it('handles "array" of "object" data properties', () => {
      const instance = Madrone.Model.create({
        array: [{ foo: 1, bar: 2 }, { baz: 3 }]
      }).create();

      expect(instance.toJSON()).toEqual({ array: [{ foo: 1, bar: 2 }, { baz: 3 }] });
    });

    it('handles "array" of "array" data properties', () => {
      const instance = Madrone.Model.create({
        array: [[{ foo: 1, bar: 2 }], [{ baz: 3 }]],
      }).create();

      expect(instance.toJSON()).toEqual({ array: [[{ foo: 1, bar: 2 }], [{ baz: 3 }]] });
    });

    it('handles "object" of "string" data properties', () => {
      const instance = Madrone.Model.create({
        object: {
          foo: 'foo1',
          bar: 'bar1',
        },
      }).create();

      expect(instance.toJSON()).toEqual({
        object: {
          foo: 'foo1',
          bar: 'bar1',
        },
      });
    });

    it('handles "object" of "object" data properties', () => {
      const instance = Madrone.Model.create({
        object: {
          foo: { nested1: 'foo1' },
          bar: { nested2: ['bar1'] },
        },
      }).create();

      expect(instance.toJSON()).toEqual({
        object: {
          foo: { nested1: 'foo1' },
          bar: { nested2: ['bar1'] },
        },
      });
    });

    it('handles "object" of circular data properties', () => {
      const instance = Madrone.Model.create({
        get object() {
          const obj = { test1: 1, test2: 2 };

          obj.circular = obj;

          return obj;
        }
      }).create();

      expect(instance.toJSON()).toEqual({
        object: {
          circular: {
            __circular__: true,
            inheritance: ['object'],
          },
          test1: 1,
          test2: 2,
        },
      });
    });

    it('handles "array" of circular data properties', () => {
      const instance = Madrone.Model.create({
        get array() {
          const array = [1, 2, 3];

          array.push(array);

          return array;
        }
      }).create();

      expect(instance.toJSON()).toEqual({
        array: [
          1,
          2,
          3,
          {
            __circular__: true,
            inheritance: ['array'],
          },
        ],
      });
    });
  });

  describe('Nested Madrone', () => {
    it('handles references to "$parent"', () => {
      const module = Madrone.Model.create({
        test: 'hello',
        get parent() {
          return this.$parent;
        },
      });

      const instance = Madrone.Model.create({
        $options: {
          created() {
            this.module = this.$createNode(module);
          },
        },
      }).create();

      expect(instance.toJSON({ infinite: true })).toEqual({
        module: {
          test: 'hello',
          parent: {
            __circular__: true,
            inheritance: [],
            resolved: true,
          },
        },
      });
    });
  });

  describe('useDataKeys', () => {
    it('only uses data properties defined on the instance', () => {
      const instance = Madrone.Model.create({
        dataProperty: true,
        get emptyString() {
          return '';
        },
        get string() {
          return 'string1';
        }
      }).create();

      expect(instance.toJSON({ useDataKeys: true })).toEqual({ dataProperty: true });
    });
  });

  describe('relationships toJSON', () => {
    it('can resolve relationships', () => {
      const model2 = Madrone.Model.create({
        $options: {
          data() {
            return {
              entries: {
                test1: true,
                test2: false,
              },
            };
          },
          relationships: {
            bar: {
              default: ['test1', 'test2'],
              joinOn: 'barJoin',
              resolve(join) {
                return join.map((id) => this.entries[id]);
              },
            },
          },
        },
      })

      const instance = model2.create();

      expect(instance.toJSON({ useNodeIds: false })).toEqual({
        bar: [true, false],
        barJoin: ['test1', 'test2'],
        entries: {
          test1: true,
          test2: false,
        },
      });
    });

    it('can resolve relationships to their ids', () => {
      const model2 = Madrone.Model.create({
        $options: {
          data() {
            return {
              entries: {
                test1: true,
                test2: false,
              },
            };
          },
          relationships: {
            bar: {
              default: ['test1', 'test2'],
              resolve(join) {
                return join.map((id) => this.entries[id]);
              },
            },
          },
        },
      });

      const instance = model2.create();

      expect(instance.toJSON({ useNodeIds: true })).toEqual({
        bar: ['test1', 'test2'],
        entries: {
          test1: true,
          test2: false,
        },
      });
    });
  });
}
