import lodashSet from 'lodash/set';
import Madrone from '../../index';

export default function testVue(name, integration, { create } = {}) {
  beforeAll(() => {
    Madrone.use(integration);
  });
  afterAll(() => {
    Madrone.unuse(integration);
  });

  const makeGenericModel = ({ cache = true } = {}) => ({
    create() {
      return Madrone.auto(
        {
          foo: 'foo1',
          bar: 'bar1',
          get fooBar() {
            return `${this.foo}${this.bar}`;
          },
        },
        {
          fooBar: { cache },
        }
      );
    },
  });

  describe('vue usage', () => {
    const modelWithCache = makeGenericModel({ cache: true });

    it('can update if added to "data" section', async () => {
      const instanceWithCache = modelWithCache.create();
      const vm = create({
        data() {
          return {
            instanceWithCache,
          };
        },

        computed: {
          myComputed: {
            cache: true,
            get() {
              return this.instanceWithCache.fooBar;
            },
          },
        },

        // vue3 needs this
        render() {},
      });

      expect(vm.myComputed).toEqual('foo1bar1');
      instanceWithCache.foo = 'FOO';
      expect(vm.myComputed).toEqual('FOObar1');
      expect(instanceWithCache.fooBar).toEqual('FOObar1');
    });

    it('updates computed correctly', async () => {
      const instanceWithCache = modelWithCache.create();
      const vm = create({
        computed: {
          myComputed: {
            cache: true,
            get() {
              return instanceWithCache.fooBar;
            },
          },
        },

        // vue3 needs this
        render() {},
      });

      expect(vm.myComputed).toEqual('foo1bar1');
      instanceWithCache.foo = 'FOO';
      expect(vm.myComputed).toEqual('FOObar1');
      expect(instanceWithCache.fooBar).toEqual('FOObar1');
    });

    it('updates computed based on data properties', async () => {
      const instanceWithCache = modelWithCache.create();
      const vm = create({
        computed: {
          myComputed: {
            cache: true,
            get() {
              return `${instanceWithCache.foo}${instanceWithCache.bar}`;
            },
          },
        },

        // vue3 needs this
        render() {},
      });

      expect(vm.myComputed).toEqual('foo1bar1');
      instanceWithCache.foo = 'FOO';
      await new Promise(setTimeout);
      expect(instanceWithCache.foo).toEqual('FOO');
      expect(instanceWithCache.fooBar).toEqual('FOObar1');
      expect(vm.myComputed).toEqual('FOObar1');
    });

    it('can watch string computed', async () => {
      const newVals = [];
      const oldVals = [];
      const instanceWithCache = modelWithCache.create();
      const vm = create({
        computed: {
          myComputed: {
            cache: true,
            get() {
              const val = instanceWithCache.fooBar;

              return val;
            },
          },
        },

        watch: {
          myComputed(val, old) {
            newVals.push(val);
            oldVals.push(old);
          },
        },

        // vue3 needs this
        render() {},
      });

      expect(vm.myComputed).toEqual('foo1bar1');
      instanceWithCache.foo = 'FOO';
      await new Promise(setTimeout);
      expect(newVals).toEqual(['FOObar1']);
      expect(oldVals).toEqual(['foo1bar1']);
    });
  });

  it('can watch object computed', async () => {
    const newVals = [];
    const entryObject = Madrone.auto({
      entries: {},

      get all() {
        return Object.values(this.entries);
      },
    });

    const vm = create({
      computed: {
        myComputed: {
          cache: true,
          get() {
            return entryObject.all;
          },
        },
      },

      watch: {
        myComputed(val) {
          newVals.push(val);
        },
      },

      // vue3 needs this
      render() {},
    });

    expect(vm.myComputed).toEqual([]);
    entryObject.entries.foo = { name: 'foo name' };
    lodashSet(entryObject, 'entries.bar', { name: 'bar name' });
    await new Promise(setTimeout);

    const result = [{ name: 'foo name' }, { name: 'bar name' }];

    expect(newVals).toEqual([result]);
    expect(vm.myComputed).toEqual(result);
  });

  it('can watch object computed when property deleted', async () => {
    const newVals = [];
    const entryObject = Madrone.auto({
      entries: {
        foo: { name: 'foo name' },
      },

      get all() {
        return Object.values(this.entries);
      },
    });

    const vm = create({
      computed: {
        myComputed() {
          return entryObject.all;
        },
      },

      watch: {
        myComputed(val) {
          newVals.push(val);
        },
      },

      // vue3 needs this
      render() {},
    });

    expect(vm.myComputed).toEqual([{ name: 'foo name' }]);
    delete entryObject.entries.foo;
    await new Promise(setTimeout);

    expect(newVals).toEqual([[]]);
    expect(vm.myComputed).toEqual([]);
  });

  it('can break cache for object computed used in method', async () => {
    const entryObject = Madrone.auto({
      entries: {},

      get all() {
        return Object.values(this.entries);
      },

      filterBy(nm) {
        return this.all.filter((entry) => entry && entry.name === nm);
      },

      getFilteredNames(nm) {
        return this.filterBy(nm).map((entry) => entry.name);
      },
    });
    const vm = create({
      data() {
        return {
          filterBy: null,
        };
      },

      computed: {
        myComputed() {
          return entryObject.filterBy(this.filterBy);
        },

        myNameComputed() {
          return entryObject.getFilteredNames(this.filterBy);
        },
      },

      // vue3 needs this
      render() {},
    });

    const result = { name: 'bar' };

    expect(vm.myComputed).toEqual([]);
    entryObject.entries.foo = { name: 'foo name' };
    expect(vm.myNameComputed).toEqual([]);
    expect(vm.myComputed).toEqual([]);

    entryObject.entries.foo.name = result.name;
    expect(vm.myNameComputed).toEqual([]);
    expect(vm.myComputed).toEqual([]);

    vm.filterBy = 'bar';
    expect(vm.myComputed).toEqual([result]);
    expect(vm.myNameComputed).toEqual(['bar']);
  });
}
