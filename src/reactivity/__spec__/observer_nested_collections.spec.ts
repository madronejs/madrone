import { describe, it, expect } from 'vitest';
import Observer from '../Observer';
import Reactive from '../Reactive';
import { isReactive } from '../global';

describe('nested collections', () => {
  describe('Set nested in object', () => {
    it('busts cache when Set.add is called on nested Set', () => {
      let counter = 0;
      const state = Reactive({ tags: new Set<string>() });
      const obs = Observer({
        get: () => {
          counter += 1;
          return state.tags.size;
        },
      });

      expect(obs.value).toEqual(0);
      expect(counter).toEqual(1);
      state.tags.add('foo');
      expect(obs.value).toEqual(1);
      expect(counter).toEqual(2);
    });

    it('busts cache when Set.delete is called on nested Set', () => {
      let counter = 0;
      const state = Reactive({ tags: new Set(['foo', 'bar']) });
      const obs = Observer({
        get: () => {
          counter += 1;
          return state.tags.has('foo');
        },
      });

      expect(obs.value).toEqual(true);
      expect(counter).toEqual(1);
      state.tags.delete('foo');
      expect(obs.value).toEqual(false);
      expect(counter).toEqual(2);
    });

    it('busts cache when Set.clear is called on nested Set', () => {
      let counter = 0;
      const state = Reactive({ tags: new Set(['foo', 'bar']) });
      const obs = Observer({
        get: () => {
          counter += 1;
          return state.tags.size;
        },
      });

      expect(obs.value).toEqual(2);
      expect(counter).toEqual(1);
      state.tags.clear();
      expect(obs.value).toEqual(0);
      expect(counter).toEqual(2);
    });

    it('busts cache when iterating nested Set with spread', () => {
      let counter = 0;
      const state = Reactive({ numbers: new Set([1, 2]) });
      const obs = Observer({
        get: () => {
          counter += 1;
          return [...state.numbers].reduce((sum, n) => sum + n, 0);
        },
      });

      expect(obs.value).toEqual(3);
      expect(counter).toEqual(1);
      state.numbers.add(3);
      expect(obs.value).toEqual(6);
      expect(counter).toEqual(2);
    });

    it('makes nested Set reactive', () => {
      const state = Reactive({ tags: new Set<string>() });

      expect(isReactive(state.tags)).toBe(true);
    });
  });

  describe('Map nested in object', () => {
    it('busts cache when Map.set is called on nested Map', () => {
      let counter = 0;
      const state = Reactive({ config: new Map<string, number>() });
      const obs = Observer({
        get: () => {
          counter += 1;
          return state.config.get('count') ?? 0;
        },
      });

      expect(obs.value).toEqual(0);
      expect(counter).toEqual(1);
      state.config.set('count', 42);
      expect(obs.value).toEqual(42);
      expect(counter).toEqual(2);
    });

    it('busts cache when Map.delete is called on nested Map', () => {
      let counter = 0;
      const state = Reactive({ config: new Map([['key', 'value']]) });
      const obs = Observer({
        get: () => {
          counter += 1;
          return state.config.has('key');
        },
      });

      expect(obs.value).toEqual(true);
      expect(counter).toEqual(1);
      state.config.delete('key');
      expect(obs.value).toEqual(false);
      expect(counter).toEqual(2);
    });

    it('busts cache when Map.clear is called on nested Map', () => {
      let counter = 0;
      const state = Reactive({ config: new Map([['a', 1], ['b', 2]]) });
      const obs = Observer({
        get: () => {
          counter += 1;
          return state.config.size;
        },
      });

      expect(obs.value).toEqual(2);
      expect(counter).toEqual(1);
      state.config.clear();
      expect(obs.value).toEqual(0);
      expect(counter).toEqual(2);
    });

    it('busts cache when iterating nested Map', () => {
      let counter = 0;
      const state = Reactive({ scores: new Map([['a', 1], ['b', 2]]) });
      const obs = Observer({
        get: () => {
          counter += 1;

          let sum = 0;

          for (const [, v] of state.scores) {
            sum += v;
          }
          return sum;
        },
      });

      expect(obs.value).toEqual(3);
      expect(counter).toEqual(1);
      state.scores.set('c', 3);
      expect(obs.value).toEqual(6);
      expect(counter).toEqual(2);
    });

    it('makes nested Map reactive', () => {
      const state = Reactive({ config: new Map<string, number>() });

      expect(isReactive(state.config)).toBe(true);
    });
  });

  describe('Set nested in array', () => {
    it('busts cache when Set.add is called on Set in array', () => {
      let counter = 0;
      const state = Reactive([new Set<string>()]);
      const obs = Observer({
        get: () => {
          counter += 1;
          return state[0].size;
        },
      });

      expect(obs.value).toEqual(0);
      expect(counter).toEqual(1);
      state[0].add('foo');
      expect(obs.value).toEqual(1);
      expect(counter).toEqual(2);
    });

    it('busts cache when iterating Set in array', () => {
      let counter = 0;
      const state = Reactive([new Set([1, 2]), new Set([3, 4])]);
      const obs = Observer({
        get: () => {
          counter += 1;
          return [...state[0], ...state[1]].reduce((sum, n) => sum + n, 0);
        },
      });

      expect(obs.value).toEqual(10);
      expect(counter).toEqual(1);
      state[0].add(5);
      expect(obs.value).toEqual(15);
      expect(counter).toEqual(2);
    });

    it('makes Set in array reactive', () => {
      const state = Reactive([new Set<string>()]);

      expect(isReactive(state[0])).toBe(true);
    });
  });

  describe('Map nested in array', () => {
    it('busts cache when Map.set is called on Map in array', () => {
      let counter = 0;
      const state = Reactive([new Map<string, number>()]);
      const obs = Observer({
        get: () => {
          counter += 1;
          return state[0].get('count') ?? 0;
        },
      });

      expect(obs.value).toEqual(0);
      expect(counter).toEqual(1);
      state[0].set('count', 10);
      expect(obs.value).toEqual(10);
      expect(counter).toEqual(2);
    });

    it('busts cache when iterating Map in array', () => {
      let counter = 0;
      const state = Reactive([new Map([['a', 1]]), new Map([['b', 2]])]);
      const obs = Observer({
        get: () => {
          counter += 1;

          let sum = 0;

          for (const map of state) {
            for (const [, v] of map) {
              sum += v;
            }
          }
          return sum;
        },
      });

      expect(obs.value).toEqual(3);
      expect(counter).toEqual(1);
      state[0].set('c', 3);
      expect(obs.value).toEqual(6);
      expect(counter).toEqual(2);
    });

    it('makes Map in array reactive', () => {
      const state = Reactive([new Map<string, number>()]);

      expect(isReactive(state[0])).toBe(true);
    });
  });

  describe('deeply nested collections', () => {
    it('busts cache for object -> array -> Set', () => {
      let counter = 0;
      const state = Reactive({
        groups: [new Set(['a']), new Set(['b'])],
      });
      const obs = Observer({
        get: () => {
          counter += 1;
          return state.groups[0].has('c');
        },
      });

      expect(obs.value).toEqual(false);
      expect(counter).toEqual(1);
      state.groups[0].add('c');
      expect(obs.value).toEqual(true);
      expect(counter).toEqual(2);
    });

    it('busts cache for object -> array -> Map', () => {
      let counter = 0;
      const state = Reactive({
        configs: [new Map([['key', 'value1']]), new Map([['key', 'value2']])],
      });
      const obs = Observer({
        get: () => {
          counter += 1;
          return state.configs[0].get('key');
        },
      });

      expect(obs.value).toEqual('value1');
      expect(counter).toEqual(1);
      state.configs[0].set('key', 'updated');
      expect(obs.value).toEqual('updated');
      expect(counter).toEqual(2);
    });

    it('busts cache for array -> object -> Set', () => {
      let counter = 0;
      const state = Reactive([
        { tags: new Set(['foo']) },
        { tags: new Set(['bar']) },
      ]);
      const obs = Observer({
        get: () => {
          counter += 1;
          return state[0].tags.size;
        },
      });

      expect(obs.value).toEqual(1);
      expect(counter).toEqual(1);
      state[0].tags.add('baz');
      expect(obs.value).toEqual(2);
      expect(counter).toEqual(2);
    });

    it('busts cache for array -> object -> Map', () => {
      let counter = 0;
      const state = Reactive([
        { data: new Map([['count', 1]]) },
        { data: new Map([['count', 2]]) },
      ]);
      const obs = Observer({
        get: () => {
          counter += 1;
          return state[0].data.get('count');
        },
      });

      expect(obs.value).toEqual(1);
      expect(counter).toEqual(1);
      state[0].data.set('count', 10);
      expect(obs.value).toEqual(10);
      expect(counter).toEqual(2);
    });

    it('busts cache for object -> object -> Set', () => {
      let counter = 0;
      const state = Reactive({
        user: {
          permissions: new Set(['read']),
        },
      });
      const obs = Observer({
        get: () => {
          counter += 1;
          return state.user.permissions.has('write');
        },
      });

      expect(obs.value).toEqual(false);
      expect(counter).toEqual(1);
      state.user.permissions.add('write');
      expect(obs.value).toEqual(true);
      expect(counter).toEqual(2);
    });

    it('busts cache for object -> object -> Map', () => {
      let counter = 0;
      const state = Reactive({
        user: {
          settings: new Map([['theme', 'light']]),
        },
      });
      const obs = Observer({
        get: () => {
          counter += 1;
          return state.user.settings.get('theme');
        },
      });

      expect(obs.value).toEqual('light');
      expect(counter).toEqual(1);
      state.user.settings.set('theme', 'dark');
      expect(obs.value).toEqual('dark');
      expect(counter).toEqual(2);
    });
  });

  describe('objects inside collections', () => {
    it('busts cache when object inside Map is modified', () => {
      let counter = 0;
      const state = Reactive({
        users: new Map([['user1', { name: 'Alice', age: 30 }]]),
      });
      const obs = Observer({
        get: () => {
          counter += 1;
          return state.users.get('user1')?.age;
        },
      });

      expect(obs.value).toEqual(30);
      expect(counter).toEqual(1);
      state.users.get('user1')!.age = 31;
      expect(obs.value).toEqual(31);
      expect(counter).toEqual(2);
    });

    it('makes objects inside Map reactive', () => {
      const state = Reactive({
        items: new Map([['item1', { value: 1 }]]),
      });
      const item = state.items.get('item1');

      expect(isReactive(item)).toBe(true);
    });

    it('busts cache when object inside Set is modified', () => {
      let counter = 0;
      const obj = { value: 1 };
      const state = Reactive({
        items: new Set([obj]),
      });
      const obs = Observer({
        get: () => {
          counter += 1;

          let sum = 0;

          for (const item of state.items) {
            sum += item.value;
          }
          return sum;
        },
      });

      expect(obs.value).toEqual(1);
      expect(counter).toEqual(1);

      for (const item of state.items) {
        item.value = 10;
      }

      expect(obs.value).toEqual(10);
      expect(counter).toEqual(2);
    });

    it('makes objects inside Set reactive when iterating', () => {
      const state = Reactive({
        items: new Set([{ value: 1 }]),
      });

      for (const item of state.items) {
        expect(isReactive(item)).toBe(true);
      }
    });
  });

  describe('arrays inside collections', () => {
    it('busts cache when array inside Map is modified', () => {
      let counter = 0;
      const state = Reactive({
        lists: new Map([['list1', [1, 2, 3]]]),
      });
      const obs = Observer({
        get: () => {
          counter += 1;
          return state.lists.get('list1')?.length ?? 0;
        },
      });

      expect(obs.value).toEqual(3);
      expect(counter).toEqual(1);
      state.lists.get('list1')!.push(4);
      expect(obs.value).toEqual(4);
      expect(counter).toEqual(2);
    });

    it('makes arrays inside Map reactive', () => {
      const state = Reactive({
        lists: new Map([['list1', [1, 2, 3]]]),
      });
      const list = state.lists.get('list1');

      expect(isReactive(list)).toBe(true);
    });
  });

  describe('replacing nested collections', () => {
    it('busts cache when nested Set is replaced', () => {
      let counter = 0;
      const state = Reactive<{ tags: Set<string> }>({ tags: new Set(['a']) });
      const obs = Observer({
        get: () => {
          counter += 1;
          return state.tags.size;
        },
      });

      expect(obs.value).toEqual(1);
      expect(counter).toEqual(1);
      state.tags = new Set(['x', 'y', 'z']);
      expect(obs.value).toEqual(3);
      expect(counter).toEqual(2);
    });

    it('busts cache when nested Map is replaced', () => {
      let counter = 0;
      const state = Reactive<{ config: Map<string, number> }>({
        config: new Map([['a', 1]]),
      });
      const obs = Observer({
        get: () => {
          counter += 1;
          return state.config.size;
        },
      });

      expect(obs.value).toEqual(1);
      expect(counter).toEqual(1);
      state.config = new Map([['x', 1], ['y', 2]]);
      expect(obs.value).toEqual(2);
      expect(counter).toEqual(2);
    });

    it('new Set replacement is reactive', () => {
      const state = Reactive<{ tags: Set<string> }>({ tags: new Set() });

      state.tags = new Set(['new']);
      expect(isReactive(state.tags)).toBe(true);
    });

    it('new Map replacement is reactive', () => {
      const state = Reactive<{ config: Map<string, number> }>({
        config: new Map(),
      });

      state.config = new Map([['new', 1]]);
      expect(isReactive(state.config)).toBe(true);
    });
  });

  describe('nested collections in nested collections', () => {
    it('busts cache for Map containing Set', () => {
      let counter = 0;
      const state = Reactive({
        permissions: new Map([['admin', new Set(['read', 'write'])]]),
      });
      const obs = Observer({
        get: () => {
          counter += 1;
          return state.permissions.get('admin')?.has('delete') ?? false;
        },
      });

      expect(obs.value).toEqual(false);
      expect(counter).toEqual(1);
      state.permissions.get('admin')!.add('delete');
      expect(obs.value).toEqual(true);
      expect(counter).toEqual(2);
    });

    it('busts cache for Set operations on Map value', () => {
      let counter = 0;
      const state = Reactive({
        userTags: new Map([['user1', new Set<string>()]]),
      });
      const obs = Observer({
        get: () => {
          counter += 1;
          return state.userTags.get('user1')?.size ?? 0;
        },
      });

      expect(obs.value).toEqual(0);
      expect(counter).toEqual(1);
      state.userTags.get('user1')!.add('vip');
      expect(obs.value).toEqual(1);
      expect(counter).toEqual(2);
      state.userTags.get('user1')!.add('premium');
      expect(obs.value).toEqual(2);
      expect(counter).toEqual(3);
    });

    it('makes Set inside Map reactive', () => {
      const state = Reactive({
        data: new Map([['key', new Set([1, 2, 3])]]),
      });
      const innerSet = state.data.get('key');

      expect(isReactive(innerSet)).toBe(true);
    });
  });
});
