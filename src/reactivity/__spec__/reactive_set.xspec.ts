import { describe, it, expect } from 'vitest';
import Reactive from '../Reactive';
import { isReactive } from '../global';

describe('Reactive sets', () => {
  it('iterates using reactive forEach', () => {
    const set = new Set([{ foo: true }, { foo: false }, { foo: true }]);
    const obs = Reactive(set);

    for (const item of obs) {
      expect(isReactive(item)).toEqual(true);
    }
  });

  it('makes reactive array from Array.from', () => {
    const set = new Set([{ foo: true }, { foo: false }, { foo: true }]);
    const obs = Reactive(set);

    obs.entries();

    for (const item of obs) {
      expect(isReactive(item)).toEqual(true);
    }
  });
});
