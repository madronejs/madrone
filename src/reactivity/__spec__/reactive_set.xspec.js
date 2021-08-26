import Reactive from '../Reactive';
import { isReactive } from '../global';

describe('Reactive sets', () => {
  it('iterates using reactive forEach', () => {
    const set = new Set([{ foo: true }, { foo: false }, { foo: true }]);
    const obs = Reactive.create(set);

    obs.forEach((item) => {
      expect(isReactive(item)).toEqual(true);
    });
  });

  it('makes reactive array from Array.from', () => {
    const set = new Set([{ foo: true }, { foo: false }, { foo: true }]);
    const obs = Reactive.create(set);

    obs.entries();

    Array.from(obs).forEach((item) => {
      expect(isReactive(item)).toEqual(true);
    });
  });
});
