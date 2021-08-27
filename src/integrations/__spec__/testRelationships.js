import Madrone from '../../index';
import { RelationshipsPlugin } from '../../plugins';

export default function testRelationships(name, integration) {
  beforeAll(() => {
    Madrone.use(integration);
    Madrone.use(RelationshipsPlugin);
  });
  afterAll(() => {
    Madrone.unuse(integration);
    Madrone.unuse(RelationshipsPlugin);
  });

  describe('basic relationship usage', () => {
    const def = {
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
            default: [],
            joinOn: 'foo',
            resolve(join) {
              return join.map((id) => this.entries[id]);
            },
          },
        },
      }
    };
    const model = Madrone.Model.create(def);

    it('can get the relationship join keys via $relationshipJoinKeys', () => {
      const instance = model.create();

      expect(instance.$relationshipJoinKeys).toEqual(['foo']);
    });

    it('can get the relationship keys via $relationshipKeys', () => {
      const instance = model.create();

      expect(instance.$relationshipKeys).toEqual(['bar']);
    });

    it('can get the keys without join keys via $nonRelationshipJoinKeys', () => {
      const instance = model.create();

      expect(instance.$nonRelationshipJoinKeys).toEqual(['entries', 'bar']);
    });

    it('adds the relationship mappings to the context', () => {
      const instance = model.create();

      expect(instance.$relationships.values).toEqual(def.$options.relationships);
    });

    it('can test if property is relationship', () => {
      const instance = model.create();

      expect(instance.$isRelationship('bar')).toEqual(true);
      expect(instance.$isRelationship('foo')).toEqual(false);
      expect(instance.$isRelationship('random')).toEqual(false);
    });

    it('can get the join name from a property name', () => {
      const instance = model.create();

      expect(instance.$relationshipJoin('bar')).toEqual('foo');
      expect(instance.$relationshipJoin('foo')).toEqual(undefined);
      expect(instance.$relationshipJoin('random')).toEqual(undefined);
    });

    it('can get the join value from a property name', () => {
      const instance = model.create();

      expect(instance.$relationshipJoinValue('bar')).toEqual([]);
      expect(instance.$relationshipJoinValue('foo')).toEqual(undefined);
      expect(instance.$relationshipJoinValue('random')).toEqual(undefined);
    });

    it('adds computed and data properties', () => {
      const instance = model.create();

      expect(instance.foo).toEqual([]);
      expect(instance.bar).toEqual([]);
      instance.foo.push('test1', 'test2');
      expect(instance.foo).toEqual(['test1', 'test2']);
      expect(instance.bar).toEqual([true, false]);
    });

    it('uses the default value', () => {
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
      expect(instance.bar).toEqual([true, false]);
    });

    it('can override the default setter', () => {
      let count = 0;
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
              default: [],
              setRelationship(joinOn, val) {
                count += 1;
                this[joinOn] = val;
              },
              resolve(join) {
                return join.map((id) => this.entries[id]);
              },
            },
          },
        },
      });

      const instance = model2.create();

      expect(count).toEqual(0);
      expect(instance.bar).toEqual([]);
      instance.bar = ['test1'];
      expect(instance.bar).toEqual([true]);
      expect(count).toEqual(1);
    });

    it('creates a "joinOn" value if no value is provided', () => {
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
              default: [],
              resolve(join) {
                return join.map((id) => this.entries[id]);
              },
            },
          },
        },
      });

      const instance = model2.create();

      expect(instance.$relationshipJoin('bar').startsWith('__relationship')).toEqual(true);
    });

    it('can be called by computed property immediately with the default value', () => {
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
          computed: {
            test() {
              return this.bar.map((val) => val);
            },
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

      expect(instance.test).toEqual([true, false]);
    });
  });
}
