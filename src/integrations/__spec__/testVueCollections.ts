import {
  describe, it, expect, beforeAll, afterAll,
} from 'vitest';
import Madrone from '../../index';
import { delay } from '@/test/util';

export default function testVueCollections(name, integration, options) {
  const { create } = options || {};

  beforeAll(() => {
    Madrone.use(integration);
  });
  afterAll(() => {
    Madrone.unuse(integration);
  });

  describe(`${name} Set reactivity`, () => {
    it('Vue computed reacts to Set.add', async () => {
      const store = Madrone.auto({
        tags: new Set<string>(),
        get tagCount() {
          return this.tags.size;
        },
      });

      const vm = create({
        computed: {
          count() {
            return store.tagCount;
          },
        },
        render() {},
      });

      expect(vm.count).toEqual(0);
      store.tags.add('one');
      await delay();
      expect(vm.count).toEqual(1);
    });

    it('Vue computed reacts to Set.delete', async () => {
      const store = Madrone.auto({
        tags: new Set(['a', 'b', 'c']),
        get tagCount() {
          return this.tags.size;
        },
      });

      const vm = create({
        computed: {
          count() {
            return store.tagCount;
          },
        },
        render() {},
      });

      expect(vm.count).toEqual(3);
      store.tags.delete('a');
      await delay();
      expect(vm.count).toEqual(2);
    });

    it('Vue computed reacts to Set.clear', async () => {
      const store = Madrone.auto({
        tags: new Set(['a', 'b']),
        get isEmpty() {
          return this.tags.size === 0;
        },
      });

      const vm = create({
        computed: {
          empty() {
            return store.isEmpty;
          },
        },
        render() {},
      });

      expect(vm.empty).toEqual(false);
      store.tags.clear();
      await delay();
      expect(vm.empty).toEqual(true);
    });

    it('Vue computed reacts to Set iteration with spread', async () => {
      const store = Madrone.auto({
        numbers: new Set([1, 2]),
        get sum() {
          return [...this.numbers].reduce((acc, n) => acc + n, 0);
        },
      });

      const vm = create({
        computed: {
          total() {
            return store.sum;
          },
        },
        render() {},
      });

      expect(vm.total).toEqual(3);
      store.numbers.add(3);
      await delay();
      expect(vm.total).toEqual(6);
    });

    it('Vue computed reacts to Set iteration with Array.from', async () => {
      const store = Madrone.auto({
        items: new Set(['a', 'b']),
        get all() {
          // eslint-disable-next-line unicorn/prefer-spread -- testing Array.from specifically
          return Array.from(this.items);
        },
      });

      const vm = create({
        computed: {
          allItems() {
            return store.all;
          },
        },
        render() {},
      });

      expect(vm.allItems).toEqual(['a', 'b']);
      store.items.add('c');
      await delay();
      expect(vm.allItems).toEqual(['a', 'b', 'c']);
    });

    it('Vue computed reacts to Set iteration with for...of', async () => {
      const store = Madrone.auto({
        values: new Set([1, 2, 3]),
        get doubled() {
          const result: number[] = [];

          for (const v of this.values) {
            result.push(v * 2);
          }

          return result;
        },
      });

      const vm = create({
        computed: {
          doubledValues() {
            return store.doubled;
          },
        },
        render() {},
      });

      expect(vm.doubledValues).toEqual([2, 4, 6]);
      store.values.add(4);
      await delay();
      expect(vm.doubledValues).toEqual([2, 4, 6, 8]);
    });

    it('Vue computed reacts to Set.has check', async () => {
      const store = Madrone.auto({
        permissions: new Set(['read']),
        get canWrite() {
          return this.permissions.has('write');
        },
      });

      const vm = create({
        computed: {
          hasWriteAccess() {
            return store.canWrite;
          },
        },
        render() {},
      });

      expect(vm.hasWriteAccess).toEqual(false);
      store.permissions.add('write');
      await delay();
      expect(vm.hasWriteAccess).toEqual(true);
    });

    it('Vue watcher fires on Set modifications', async () => {
      const store = Madrone.auto({
        tags: new Set<string>(),
      });

      const changes: number[] = [];

      const vm = create({
        computed: {
          tagSize() {
            return store.tags.size;
          },
        },
        watch: {
          tagSize(val) {
            changes.push(val);
          },
        },
        render() {},
      });

      expect(vm.tagSize).toEqual(0);
      store.tags.add('one');
      await delay();
      store.tags.add('two');
      await delay();

      expect(changes).toEqual([1, 2]);
    });
  });

  describe(`${name} Map reactivity`, () => {
    it('Vue computed reacts to Map.set', async () => {
      const store = Madrone.auto({
        config: new Map<string, number>(),
        get total() {
          let sum = 0;

          for (const v of this.config.values()) {
            sum += v;
          }

          return sum;
        },
      });

      const vm = create({
        computed: {
          configTotal() {
            return store.total;
          },
        },
        render() {},
      });

      expect(vm.configTotal).toEqual(0);
      store.config.set('a', 10);
      await delay();
      expect(vm.configTotal).toEqual(10);
      store.config.set('b', 20);
      await delay();
      expect(vm.configTotal).toEqual(30);
    });

    it('Vue computed reacts to Map.delete', async () => {
      const store = Madrone.auto({
        data: new Map([['key', 'value']]),
        get hasKey() {
          return this.data.has('key');
        },
      });

      const vm = create({
        computed: {
          keyExists() {
            return store.hasKey;
          },
        },
        render() {},
      });

      expect(vm.keyExists).toEqual(true);
      store.data.delete('key');
      await delay();
      expect(vm.keyExists).toEqual(false);
    });

    it('Vue computed reacts to Map.clear', async () => {
      const store = Madrone.auto({
        items: new Map([['a', 1], ['b', 2]]),
        get count() {
          return this.items.size;
        },
      });

      const vm = create({
        computed: {
          itemCount() {
            return store.count;
          },
        },
        render() {},
      });

      expect(vm.itemCount).toEqual(2);
      store.items.clear();
      await delay();
      expect(vm.itemCount).toEqual(0);
    });

    it('Vue computed reacts to Map.get value changes', async () => {
      const store = Madrone.auto({
        scores: new Map([['player1', 0]]),
        get player1Score() {
          return this.scores.get('player1') ?? 0;
        },
      });

      const vm = create({
        computed: {
          score() {
            return store.player1Score;
          },
        },
        render() {},
      });

      expect(vm.score).toEqual(0);
      store.scores.set('player1', 100);
      await delay();
      expect(vm.score).toEqual(100);
    });

    it('Vue computed reacts to Map iteration with spread', async () => {
      const store = Madrone.auto({
        data: new Map([['a', 1], ['b', 2]]),
        get entries() {
          return [...this.data.entries()];
        },
      });

      const vm = create({
        computed: {
          allEntries() {
            return store.entries;
          },
        },
        render() {},
      });

      expect(vm.allEntries).toEqual([['a', 1], ['b', 2]]);
      store.data.set('c', 3);
      await delay();
      expect(vm.allEntries).toEqual([['a', 1], ['b', 2], ['c', 3]]);
    });

    it('Vue computed reacts to Map.keys() iteration', async () => {
      const store = Madrone.auto({
        items: new Map([['x', 1], ['y', 2]]),
        get allKeys() {
          return [...this.items.keys()];
        },
      });

      const vm = create({
        computed: {
          keys() {
            return store.allKeys;
          },
        },
        render() {},
      });

      expect(vm.keys).toEqual(['x', 'y']);
      store.items.set('z', 3);
      await delay();
      expect(vm.keys).toEqual(['x', 'y', 'z']);
    });

    it('Vue computed reacts to Map.values() iteration', async () => {
      const store = Madrone.auto({
        items: new Map([['a', 10], ['b', 20]]),
        get allValues() {
          return [...this.items.values()];
        },
      });

      const vm = create({
        computed: {
          values() {
            return store.allValues;
          },
        },
        render() {},
      });

      expect(vm.values).toEqual([10, 20]);
      store.items.set('c', 30);
      await delay();
      expect(vm.values).toEqual([10, 20, 30]);
    });

    it('Vue computed reacts to Map for...of iteration', async () => {
      const store = Madrone.auto({
        pairs: new Map([['a', 1], ['b', 2]]),
        get sum() {
          let total = 0;

          for (const [, v] of this.pairs) {
            total += v;
          }

          return total;
        },
      });

      const vm = create({
        computed: {
          totalSum() {
            return store.sum;
          },
        },
        render() {},
      });

      expect(vm.totalSum).toEqual(3);
      store.pairs.set('c', 3);
      await delay();
      expect(vm.totalSum).toEqual(6);
    });

    it('Vue watcher fires on Map modifications', async () => {
      const store = Madrone.auto({
        config: new Map<string, number>(),
      });

      const changes: number[] = [];

      const vm = create({
        computed: {
          configSize() {
            return store.config.size;
          },
        },
        watch: {
          configSize(val) {
            changes.push(val);
          },
        },
        render() {},
      });

      expect(vm.configSize).toEqual(0);
      store.config.set('x', 1);
      await delay();
      store.config.set('y', 2);
      await delay();

      expect(changes).toEqual([1, 2]);
    });
  });

  describe(`${name} nested collections`, () => {
    it('Vue computed reacts to Set nested in object', async () => {
      const store = Madrone.auto({
        user: {
          roles: new Set(['viewer']),
        },
        get isAdmin() {
          return this.user.roles.has('admin');
        },
      });

      const vm = create({
        computed: {
          adminStatus() {
            return store.isAdmin;
          },
        },
        render() {},
      });

      expect(vm.adminStatus).toEqual(false);
      store.user.roles.add('admin');
      await delay();
      expect(vm.adminStatus).toEqual(true);
    });

    it('Vue computed reacts to Map nested in object', async () => {
      const store = Madrone.auto({
        user: {
          settings: new Map([['theme', 'light']]),
        },
        get theme() {
          return this.user.settings.get('theme');
        },
      });

      const vm = create({
        computed: {
          currentTheme() {
            return store.theme;
          },
        },
        render() {},
      });

      expect(vm.currentTheme).toEqual('light');
      store.user.settings.set('theme', 'dark');
      await delay();
      expect(vm.currentTheme).toEqual('dark');
    });

    it('Vue computed reacts to Set in array', async () => {
      const store = Madrone.auto({
        groups: [new Set(['a']), new Set(['b'])],
        get totalItems() {
          return this.groups.reduce((sum, set) => sum + set.size, 0);
        },
      });

      const vm = create({
        computed: {
          itemCount() {
            return store.totalItems;
          },
        },
        render() {},
      });

      expect(vm.itemCount).toEqual(2);
      store.groups[0].add('c');
      await delay();
      expect(vm.itemCount).toEqual(3);
    });

    it('Vue computed reacts to Map in array', async () => {
      const store = Madrone.auto({
        tables: [new Map([['count', 5]]), new Map([['count', 10]])],
        get totalCount() {
          return this.tables.reduce((sum, map) => sum + (map.get('count') ?? 0), 0);
        },
      });

      const vm = create({
        computed: {
          total() {
            return store.totalCount;
          },
        },
        render() {},
      });

      expect(vm.total).toEqual(15);
      store.tables[0].set('count', 20);
      await delay();
      expect(vm.total).toEqual(30);
    });

    it('Vue computed reacts to objects inside Map', async () => {
      const store = Madrone.auto({
        users: new Map([['user1', { name: 'Alice', score: 100 }]]),
        get user1Score() {
          return this.users.get('user1')?.score ?? 0;
        },
      });

      const vm = create({
        computed: {
          score() {
            return store.user1Score;
          },
        },
        render() {},
      });

      expect(vm.score).toEqual(100);
      store.users.get('user1')!.score = 200;
      await delay();
      expect(vm.score).toEqual(200);
    });

    it('Vue computed reacts to Set inside Map', async () => {
      const store = Madrone.auto({
        permissions: new Map([['admin', new Set(['read', 'write'])]]),
        get adminCanDelete() {
          return this.permissions.get('admin')?.has('delete') ?? false;
        },
      });

      const vm = create({
        computed: {
          canDelete() {
            return store.adminCanDelete;
          },
        },
        render() {},
      });

      expect(vm.canDelete).toEqual(false);
      store.permissions.get('admin')!.add('delete');
      await delay();
      expect(vm.canDelete).toEqual(true);
    });
  });

  describe(`${name} collection replacement`, () => {
    it('Vue computed reacts to Set replacement', async () => {
      const store = Madrone.auto({
        tags: new Set(['old']) as Set<string>,
        get firstTag() {
          return [...this.tags][0];
        },
      });

      const vm = create({
        computed: {
          first() {
            return store.firstTag;
          },
        },
        render() {},
      });

      expect(vm.first).toEqual('old');
      store.tags = new Set(['new']);
      await delay();
      expect(vm.first).toEqual('new');
    });

    it('Vue computed reacts to Map replacement', async () => {
      const store = Madrone.auto({
        config: new Map([['key', 'old']]) as Map<string, string>,
        get value() {
          return this.config.get('key');
        },
      });

      const vm = create({
        computed: {
          configValue() {
            return store.value;
          },
        },
        render() {},
      });

      expect(vm.configValue).toEqual('old');
      store.config = new Map([['key', 'new']]);
      await delay();
      expect(vm.configValue).toEqual('new');
    });
  });

  describe(`${name} direct Vue computed with collections`, () => {
    it('Vue computed directly iterates Set', async () => {
      const store = Madrone.auto({
        numbers: new Set([1, 2, 3]),
      });

      const vm = create({
        computed: {
          sum() {
            return [...store.numbers].reduce((acc, n) => acc + n, 0);
          },
        },
        render() {},
      });

      expect(vm.sum).toEqual(6);
      store.numbers.add(4);
      await delay();
      expect(vm.sum).toEqual(10);
    });

    it('Vue computed directly iterates Map', async () => {
      const store = Madrone.auto({
        scores: new Map([['a', 1], ['b', 2]]),
      });

      const vm = create({
        computed: {
          total() {
            let sum = 0;

            for (const [, v] of store.scores) {
              sum += v;
            }

            return sum;
          },
        },
        render() {},
      });

      expect(vm.total).toEqual(3);
      store.scores.set('c', 3);
      await delay();
      expect(vm.total).toEqual(6);
    });

    it('Vue computed directly checks Set.has', async () => {
      const store = Madrone.auto({
        flags: new Set<string>(),
      });

      const vm = create({
        computed: {
          isEnabled() {
            return store.flags.has('enabled');
          },
        },
        render() {},
      });

      expect(vm.isEnabled).toEqual(false);
      store.flags.add('enabled');
      await delay();
      expect(vm.isEnabled).toEqual(true);
    });

    it('Vue computed directly checks Map.get', async () => {
      const store = Madrone.auto({
        settings: new Map<string, boolean>(),
      });

      const vm = create({
        computed: {
          darkMode() {
            return store.settings.get('darkMode') ?? false;
          },
        },
        render() {},
      });

      expect(vm.darkMode).toEqual(false);
      store.settings.set('darkMode', true);
      await delay();
      expect(vm.darkMode).toEqual(true);
    });
  });
}
