import { describe, it, expect } from 'vitest';
import Observer from '../Observer';
import Reactive from '../Reactive';

describe('set', () => {
  it('busts cache on Array.from(set)', () => {
    let counter = 0;
    const item = new Set(['a', 'b']);
    const tracked = Reactive(item);
    const obs = Observer({
      get: () => {
        counter += 1;

        // eslint-disable-next-line unicorn/prefer-spread -- testing Array.from specifically
        return Array.from(tracked).join(',');
      },
    });

    expect(obs.value).toEqual('a,b');
    expect(obs.value).toEqual('a,b');
    expect(counter).toEqual(1);
    tracked.add('c');
    expect(obs.value).toEqual('a,b,c');
    expect(obs.value).toEqual('a,b,c');
    expect(counter).toEqual(2);
  });

  it('busts cache on [...set] spread', () => {
    let counter = 0;
    const item = new Set([1, 2]);
    const tracked = Reactive(item);
    const obs = Observer({
      get: () => {
        counter += 1;

        return [...tracked].reduce((sum, n) => sum + n, 0);
      },
    });

    expect(obs.value).toEqual(3);
    expect(counter).toEqual(1);
    tracked.add(3);
    expect(obs.value).toEqual(6);
    expect(counter).toEqual(2);
  });

  it('busts cache on Set add', () => {
    let counter = 0;
    const item = new Set();
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
    tracked.add('foo');
    expect(obs.value).toEqual(true);
    expect(obs.value).toEqual(true);
    expect(counter).toEqual(2);
  });

  it('busts cache on Set delete', () => {
    let counter = 0;
    const item = new Set(['foo']);
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

  it('busts cache on Set clear', () => {
    let counter = 0;
    const item = new Set(['foo']);
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
});
