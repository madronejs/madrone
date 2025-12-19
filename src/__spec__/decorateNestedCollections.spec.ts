/* eslint-disable max-classes-per-file */
import { describe, it, expect } from 'vitest';
import Madrone, { reactive, computed } from '../index';
import { isReactive } from '../reactivity/global';
import { delay } from '@/test/util';

describe('decorated nested collections', () => {
  describe('Set in reactive property', () => {
    it('makes Set property reactive', () => {
      class TagStore {
        @reactive tags = new Set<string>();
      }

      const store = new TagStore();

      expect(isReactive(store.tags)).toBe(true);
    });

    it('computed reacts to Set.add', async () => {
      class TagStore {
        @reactive tags = new Set<string>();

        @computed get count() {
          return this.tags.size;
        }
      }

      const store = new TagStore();

      expect(store.count).toEqual(0);
      store.tags.add('typescript');
      await delay();
      expect(store.count).toEqual(1);
    });

    it('computed reacts to Set.delete', async () => {
      class TagStore {
        @reactive tags = new Set(['a', 'b', 'c']);

        @computed get hasA() {
          return this.tags.has('a');
        }
      }

      const store = new TagStore();

      expect(store.hasA).toEqual(true);
      store.tags.delete('a');
      await delay();
      expect(store.hasA).toEqual(false);
    });

    it('computed reacts to Set.clear', async () => {
      class TagStore {
        @reactive tags = new Set(['a', 'b']);

        @computed get isEmpty() {
          return this.tags.size === 0;
        }
      }

      const store = new TagStore();

      expect(store.isEmpty).toEqual(false);
      store.tags.clear();
      await delay();
      expect(store.isEmpty).toEqual(true);
    });

    it('watcher fires when Set is modified', async () => {
      class TagStore {
        @reactive tags = new Set<string>();
      }

      const store = new TagStore();
      const changes: number[] = [];

      Madrone.watch(
        () => store.tags.size,
        (size) => changes.push(size)
      );

      store.tags.add('one');
      await delay();
      store.tags.add('two');
      await delay();

      expect(changes).toEqual([1, 2]);
    });

    it('computed reacts to Set iteration', async () => {
      class NumberStore {
        @reactive numbers = new Set([1, 2, 3]);

        @computed get sum() {
          let total = 0;

          for (const n of this.numbers) {
            total += n;
          }

          return total;
        }
      }

      const store = new NumberStore();

      expect(store.sum).toEqual(6);
      store.numbers.add(4);
      await delay();
      expect(store.sum).toEqual(10);
    });
  });

  describe('Map in reactive property', () => {
    it('makes Map property reactive', () => {
      class ConfigStore {
        @reactive config = new Map<string, unknown>();
      }

      const store = new ConfigStore();

      expect(isReactive(store.config)).toBe(true);
    });

    it('computed reacts to Map.set', async () => {
      class ConfigStore {
        @reactive config = new Map<string, number>();

        @computed get total() {
          let sum = 0;

          for (const v of this.config.values()) {
            sum += v;
          }

          return sum;
        }
      }

      const store = new ConfigStore();

      expect(store.total).toEqual(0);
      store.config.set('a', 10);
      await delay();
      expect(store.total).toEqual(10);
      store.config.set('b', 20);
      await delay();
      expect(store.total).toEqual(30);
    });

    it('computed reacts to Map.delete', async () => {
      class ConfigStore {
        @reactive config = new Map([['key', 'value']]);

        @computed get hasKey() {
          return this.config.has('key');
        }
      }

      const store = new ConfigStore();

      expect(store.hasKey).toEqual(true);
      store.config.delete('key');
      await delay();
      expect(store.hasKey).toEqual(false);
    });

    it('computed reacts to Map.clear', async () => {
      class ConfigStore {
        @reactive config = new Map([['a', 1], ['b', 2]]);

        @computed get size() {
          return this.config.size;
        }
      }

      const store = new ConfigStore();

      expect(store.size).toEqual(2);
      store.config.clear();
      await delay();
      expect(store.size).toEqual(0);
    });

    it('watcher fires when Map is modified', async () => {
      class ConfigStore {
        @reactive config = new Map<string, number>();
      }

      const store = new ConfigStore();
      const changes: number[] = [];

      Madrone.watch(
        () => store.config.size,
        (size) => changes.push(size)
      );

      store.config.set('x', 1);
      await delay();
      store.config.set('y', 2);
      await delay();

      expect(changes).toEqual([1, 2]);
    });

    it('computed reacts to Map.get value changes', async () => {
      class ScoreStore {
        @reactive scores = new Map([['player1', 0]]);

        @computed get player1Score() {
          return this.scores.get('player1') ?? 0;
        }
      }

      const store = new ScoreStore();

      expect(store.player1Score).toEqual(0);
      store.scores.set('player1', 100);
      await delay();
      expect(store.player1Score).toEqual(100);
    });
  });

  describe('nested object structures with collections', () => {
    it('computed reacts to Set in nested object', async () => {
      class UserStore {
        @reactive user = {
          name: 'Alice',
          roles: new Set(['viewer']),
        };

        @computed get isAdmin() {
          return this.user.roles.has('admin');
        }
      }

      const store = new UserStore();

      expect(store.isAdmin).toEqual(false);
      store.user.roles.add('admin');
      await delay();
      expect(store.isAdmin).toEqual(true);
    });

    it('computed reacts to Map in nested object', async () => {
      class UserStore {
        @reactive user = {
          name: 'Bob',
          settings: new Map([['theme', 'light']]),
        };

        @computed get theme() {
          return this.user.settings.get('theme');
        }
      }

      const store = new UserStore();

      expect(store.theme).toEqual('light');
      store.user.settings.set('theme', 'dark');
      await delay();
      expect(store.theme).toEqual('dark');
    });

    it('makes nested Set reactive', () => {
      class Store {
        @reactive data = {
          nested: {
            tags: new Set<string>(),
          },
        };
      }

      const store = new Store();

      expect(isReactive(store.data.nested.tags)).toBe(true);
    });

    it('makes nested Map reactive', () => {
      class Store {
        @reactive data = {
          nested: {
            config: new Map<string, number>(),
          },
        };
      }

      const store = new Store();

      expect(isReactive(store.data.nested.config)).toBe(true);
    });
  });

  describe('arrays containing collections', () => {
    it('computed reacts to Set in array', async () => {
      class GroupStore {
        @reactive groups = [
          new Set(['a']),
          new Set(['b']),
        ];

        @computed get totalItems() {
          return this.groups.reduce((sum, set) => sum + set.size, 0);
        }
      }

      const store = new GroupStore();

      expect(store.totalItems).toEqual(2);
      store.groups[0].add('c');
      await delay();
      expect(store.totalItems).toEqual(3);
    });

    it('computed reacts to Map in array', async () => {
      class TableStore {
        @reactive tables = [
          new Map([['rows', 10]]),
          new Map([['rows', 20]]),
        ];

        @computed get totalRows() {
          return this.tables.reduce((sum, map) => sum + (map.get('rows') ?? 0), 0);
        }
      }

      const store = new TableStore();

      expect(store.totalRows).toEqual(30);
      store.tables[0].set('rows', 50);
      await delay();
      expect(store.totalRows).toEqual(70);
    });

    it('makes Set in array reactive', () => {
      class Store {
        @reactive items = [new Set<string>()];
      }

      const store = new Store();

      expect(isReactive(store.items[0])).toBe(true);
    });

    it('makes Map in array reactive', () => {
      class Store {
        @reactive items = [new Map<string, number>()];
      }

      const store = new Store();

      expect(isReactive(store.items[0])).toBe(true);
    });
  });

  describe('objects inside collections', () => {
    it('computed reacts to object changes inside Map', async () => {
      class UserCache {
        @reactive users = new Map([
          ['user1', { name: 'Alice', score: 100 }],
        ]);

        @computed get user1Score() {
          return this.users.get('user1')?.score ?? 0;
        }
      }

      const cache = new UserCache();

      expect(cache.user1Score).toEqual(100);
      cache.users.get('user1')!.score = 200;
      await delay();
      expect(cache.user1Score).toEqual(200);
    });

    it('makes objects inside Map reactive', () => {
      class Store {
        @reactive items = new Map([['item', { value: 1 }]]);
      }

      const store = new Store();
      const item = store.items.get('item');

      expect(isReactive(item)).toBe(true);
    });

    it('computed reacts to object changes inside Set', async () => {
      class ItemStore {
        @reactive items = new Set([{ active: true }, { active: false }]);

        @computed get activeCount() {
          let count = 0;

          for (const item of this.items) {
            if (item.active) count += 1;
          }

          return count;
        }
      }

      const store = new ItemStore();

      expect(store.activeCount).toEqual(1);

      for (const item of store.items) {
        item.active = true;
      }

      await delay();
      expect(store.activeCount).toEqual(2);
    });

    it('makes objects inside Set reactive when iterating', () => {
      class Store {
        @reactive items = new Set([{ value: 1 }]);
      }

      const store = new Store();

      for (const item of store.items) {
        expect(isReactive(item)).toBe(true);
      }
    });
  });

  describe('replacing collections', () => {
    it('computed reacts to Set replacement', async () => {
      class Store {
        @reactive tags: Set<string> = new Set(['old']);

        @computed get firstTag() {
          return [...this.tags][0];
        }
      }

      const store = new Store();

      expect(store.firstTag).toEqual('old');
      store.tags = new Set(['new']);
      await delay();
      expect(store.firstTag).toEqual('new');
    });

    it('computed reacts to Map replacement', async () => {
      class Store {
        @reactive config: Map<string, number> = new Map([['a', 1]]);

        @computed get valueA() {
          return this.config.get('a') ?? 0;
        }
      }

      const store = new Store();

      expect(store.valueA).toEqual(1);
      store.config = new Map([['a', 999]]);
      await delay();
      expect(store.valueA).toEqual(999);
    });

    it('new Set replacement is reactive', async () => {
      class Store {
        @reactive tags: Set<string> = new Set();
      }

      const store = new Store();

      store.tags = new Set(['replaced']);
      await delay();
      expect(isReactive(store.tags)).toBe(true);
    });

    it('new Map replacement is reactive', async () => {
      class Store {
        @reactive config: Map<string, number> = new Map();
      }

      const store = new Store();

      store.config = new Map([['new', 1]]);
      await delay();
      expect(isReactive(store.config)).toBe(true);
    });
  });

  describe('nested collections in collections', () => {
    it('computed reacts to Set inside Map', async () => {
      class PermissionStore {
        @reactive permissions = new Map([
          ['admin', new Set(['read', 'write'])],
          ['user', new Set(['read'])],
        ]);

        @computed get adminCanDelete() {
          return this.permissions.get('admin')?.has('delete') ?? false;
        }
      }

      const store = new PermissionStore();

      expect(store.adminCanDelete).toEqual(false);
      store.permissions.get('admin')!.add('delete');
      await delay();
      expect(store.adminCanDelete).toEqual(true);
    });

    it('makes Set inside Map reactive', () => {
      class Store {
        @reactive data = new Map([['key', new Set([1, 2, 3])]]);
      }

      const store = new Store();
      const innerSet = store.data.get('key');

      expect(isReactive(innerSet)).toBe(true);
    });
  });

  describe('multiple reactive collection properties', () => {
    it('computed depends on multiple collection properties', async () => {
      class MultiStore {
        @reactive tags = new Set<string>();
        @reactive scores = new Map<string, number>();

        @computed get summary() {
          return `${this.tags.size} tags, ${this.scores.size} scores`;
        }
      }

      const store = new MultiStore();

      expect(store.summary).toEqual('0 tags, 0 scores');
      store.tags.add('one');
      await delay();
      expect(store.summary).toEqual('1 tags, 0 scores');
      store.scores.set('player', 100);
      await delay();
      expect(store.summary).toEqual('1 tags, 1 scores');
    });

    it('watcher can observe multiple collections', async () => {
      class MultiStore {
        @reactive setA = new Set<number>();
        @reactive setB = new Set<number>();
      }

      const store = new MultiStore();
      const changes: number[] = [];

      Madrone.watch(
        () => store.setA.size + store.setB.size,
        (total) => changes.push(total)
      );

      store.setA.add(1);
      await delay();
      store.setB.add(1);
      await delay();

      expect(changes).toEqual([1, 2]);
    });
  });

  describe('inheritance with collections', () => {
    it('subclass inherits reactive collection behavior', async () => {
      class BaseStore {
        @reactive items = new Set<string>();
      }

      class ExtendedStore extends BaseStore {
        @computed get count() {
          return this.items.size;
        }
      }

      const store = new ExtendedStore();

      expect(store.count).toEqual(0);
      store.items.add('inherited');
      await delay();
      expect(store.count).toEqual(1);
    });

    it('subclass can add its own collection properties', async () => {
      class BaseStore {
        @reactive tags = new Set<string>();
      }

      class ExtendedStore extends BaseStore {
        @reactive metadata = new Map<string, string>();

        @computed get info() {
          return `${this.tags.size} tags, ${this.metadata.size} meta`;
        }
      }

      const store = new ExtendedStore();

      expect(store.info).toEqual('0 tags, 0 meta');
      store.tags.add('tag1');
      await delay();
      expect(store.info).toEqual('1 tags, 0 meta');
      store.metadata.set('key', 'value');
      await delay();
      expect(store.info).toEqual('1 tags, 1 meta');
    });
  });
});
