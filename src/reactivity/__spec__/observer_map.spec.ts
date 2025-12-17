import { describe, it, expect } from 'vitest';
import Observer from '../Observer';
import Reactive from '../Reactive';

describe('map', () => {
  it('busts cache on Map set (new key)', () => {
    let counter = 0;
    const item = new Map();
    const tracked = Reactive(item);
    const obs = Observer({
      get: () => {
        counter += 1;
        return tracked.has('foo');
      },
    });

    expect(obs.value).toEqual(false);
    expect(obs.value).toEqual(false);
    expect(counter).toEqual(1);
    tracked.set('foo', 'bar');
    expect(obs.value).toEqual(true);
    expect(obs.value).toEqual(true);
    expect(counter).toEqual(2);
  });

  it('busts cache on Map set (existing key, new value)', () => {
    let counter = 0;
    const item = new Map([['foo', 'bar']]);
    const tracked = Reactive(item);
    const obs = Observer({
      get: () => {
        counter += 1;
        return tracked.get('foo');
      },
    });

    expect(obs.value).toEqual('bar');
    expect(obs.value).toEqual('bar');
    expect(counter).toEqual(1);
    tracked.set('foo', 'baz');
    expect(obs.value).toEqual('baz');
    expect(obs.value).toEqual('baz');
    expect(counter).toEqual(2);
  });

  it('does not bust cache on Map set (same value)', () => {
    let counter = 0;
    const item = new Map([['foo', 'bar']]);
    const tracked = Reactive(item);
    const obs = Observer({
      get: () => {
        counter += 1;
        return tracked.get('foo');
      },
    });

    expect(obs.value).toEqual('bar');
    expect(counter).toEqual(1);
    tracked.set('foo', 'bar'); // same value
    expect(obs.value).toEqual('bar');
    expect(counter).toEqual(1); // no change
  });

  it('busts cache on Map delete', () => {
    let counter = 0;
    const item = new Map([['foo', 'bar']]);
    const tracked = Reactive(item);
    const obs = Observer({
      get: () => {
        counter += 1;
        return tracked.has('foo');
      },
    });

    expect(obs.value).toEqual(true);
    expect(counter).toEqual(1);
    tracked.delete('foo');
    expect(obs.value).toEqual(false);
    expect(counter).toEqual(2);
  });

  it('busts cache on Map clear', () => {
    let counter = 0;
    const item = new Map([['foo', 'bar']]);
    const tracked = Reactive(item);
    const obs = Observer({
      get: () => {
        counter += 1;
        return tracked.has('foo');
      },
    });

    expect(obs.value).toEqual(true);
    expect(counter).toEqual(1);
    tracked.clear();
    expect(obs.value).toEqual(false);
    expect(counter).toEqual(2);
  });

  it('tracks size changes', () => {
    let counter = 0;
    const item = new Map();
    const tracked = Reactive(item);
    const obs = Observer({
      get: () => {
        counter += 1;
        return tracked.size;
      },
    });

    expect(obs.value).toEqual(0);
    expect(counter).toEqual(1);
    tracked.set('foo', 'bar');
    expect(obs.value).toEqual(1);
    expect(counter).toEqual(2);
    tracked.set('baz', 'qux');
    expect(obs.value).toEqual(2);
    expect(counter).toEqual(3);
  });

  it('tracks forEach iteration', () => {
    let counter = 0;
    const item = new Map([['a', 1], ['b', 2]]);
    const tracked = Reactive(item);
    const obs = Observer({
      get: () => {
        counter += 1;

        let sum = 0;

        for (const [, v] of tracked) {
          sum += v;
        }

        return sum;
      },
    });

    expect(obs.value).toEqual(3);
    expect(counter).toEqual(1);
    tracked.set('c', 3);
    expect(obs.value).toEqual(6);
    expect(counter).toEqual(2);
  });

  it('busts cache on map.keys() iteration', () => {
    let counter = 0;
    const item = new Map([['a', 1], ['b', 2]]);
    const tracked = Reactive(item);
    const obs = Observer({
      get: () => {
        counter += 1;

        return [...tracked.keys()].join(',');
      },
    });

    expect(obs.value).toEqual('a,b');
    expect(counter).toEqual(1);
    tracked.set('c', 3);
    expect(obs.value).toEqual('a,b,c');
    expect(counter).toEqual(2);
  });

  it('busts cache on map.values() iteration', () => {
    let counter = 0;
    const item = new Map([['a', 1], ['b', 2]]);
    const tracked = Reactive(item);
    const obs = Observer({
      get: () => {
        counter += 1;

        return [...tracked.values()].reduce((sum, n) => sum + n, 0);
      },
    });

    expect(obs.value).toEqual(3);
    expect(counter).toEqual(1);
    tracked.set('c', 3);
    expect(obs.value).toEqual(6);
    expect(counter).toEqual(2);
  });

  it('busts cache on Array.from(map)', () => {
    let counter = 0;
    const item = new Map([['a', 1], ['b', 2]]);
    const tracked = Reactive(item);
    const obs = Observer({
      get: () => {
        counter += 1;

        // eslint-disable-next-line unicorn/prefer-spread -- testing Array.from specifically
        return Array.from(tracked).length;
      },
    });

    expect(obs.value).toEqual(2);
    expect(counter).toEqual(1);
    tracked.set('c', 3);
    expect(obs.value).toEqual(3);
    expect(counter).toEqual(2);
  });
});
