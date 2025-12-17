import { describe, it, expect } from 'vitest';
import Reactive from '../Reactive';
import { isReactive } from '../global';

describe('Reactive maps', () => {
  it('returns reactive values from get', () => {
    const map = new Map([['foo', { bar: true }]]);
    const obs = Reactive(map);

    expect(isReactive(obs.get('foo'))).toEqual(true);
  });

  it('iterates using reactive forEach', () => {
    const map = new Map([
      ['a', { foo: true }],
      ['b', { foo: false }],
    ]);
    const obs = Reactive(map);

    for (const [, value] of obs) {
      expect(isReactive(value)).toEqual(true);
    }
  });

  it('makes reactive values from values()', () => {
    const map = new Map([
      ['a', { foo: true }],
      ['b', { foo: false }],
    ]);
    const obs = Reactive(map);

    for (const value of obs.values()) {
      expect(isReactive(value)).toEqual(true);
    }
  });

  it('makes reactive values from entries()', () => {
    const map = new Map([
      ['a', { foo: true }],
      ['b', { foo: false }],
    ]);
    const obs = Reactive(map);

    for (const [key, value] of obs.entries()) {
      expect(typeof key).toEqual('string');
      expect(isReactive(value)).toEqual(true);
    }
  });

  it('makes reactive values from Symbol.iterator', () => {
    const map = new Map([
      ['a', { foo: true }],
      ['b', { foo: false }],
    ]);
    const obs = Reactive(map);

    for (const [key, value] of obs) {
      expect(typeof key).toEqual('string');
      expect(isReactive(value)).toEqual(true);
    }
  });

  it('supports chaining with set', () => {
    const map = new Map<string, number>();
    const obs = Reactive(map);

    const result = obs.set('a', 1).set('b', 2).set('c', 3);

    expect(result).toBe(obs);
    expect(obs.size).toEqual(3);
  });

  it('does not make primitive values reactive', () => {
    const map = new Map([
      ['a', 1],
      ['b', 'string'],
      ['c', true],
    ]);
    const obs = Reactive(map);

    expect(obs.get('a')).toEqual(1);
    expect(obs.get('b')).toEqual('string');
    expect(obs.get('c')).toEqual(true);
  });
});
