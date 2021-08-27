import Reactive from '../Reactive';
import { isReactive } from '../global';

describe('Reactive arrays', () => {
  it('iterates using reactive forEach', () => {
    const array = [{ foo: true }, { foo: false }];
    const obs = Reactive(array);

    obs.forEach((item) => {
      expect(isReactive(item)).toEqual(true);
    });
  });

  it('iterates using reactive filter', () => {
    const array = [{ foo: true }, { foo: false }];
    const obs = Reactive(array);

    obs.filter((item) => {
      expect(isReactive(item)).toEqual(true);

      return true;
    });
  });
});
