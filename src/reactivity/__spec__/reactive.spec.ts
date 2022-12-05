import Reactive from '../Reactive';
import { isReactiveTarget, isReactive } from '../global';

describe('Reactive', () => {
  it('reuses existing Reactives if same object passed', () => {
    const object = { one: { two: { string: 'hello' } } };
    const obs = Reactive(object);
    const obs2 = Reactive(object);

    expect(obs !== object).toEqual(true);
    expect(obs === obs2).toEqual(true);
  });

  it('reuses existing Reactives if tracked item passed', () => {
    const object = { one: { two: { string: 'hello' } } };
    const obs = Reactive(object);
    const obs2 = Reactive(obs);

    expect(obs === obs2).toEqual(true);
  });

  it('reuses existing tracked item set as child to other tracked item', () => {
    const object = { one: true };
    const object2 = { two: false };
    const obs = Reactive<any>(object);
    const obs2 = Reactive(object2);

    obs.nested = obs2;

    expect(obs.nested === obs2).toEqual(true);
  });

  describe('object', () => {
    it('creates nested Reactives', () => {
      const object = { one: { two: { string: 'hello' } } };

      expect(isReactiveTarget(object)).toEqual(false);

      const obs = Reactive(object);

      expect(isReactiveTarget(object)).toEqual(true);
      expect(isReactive(object)).toEqual(false);
      expect(isReactive(obs)).toEqual(true);
      expect(isReactive(obs.one)).toEqual(true);
      expect(isReactive(obs.one.two)).toEqual(true);
      expect(isReactive(obs.one.two.string)).toEqual(false);
    });

    it('calls "onGet" hook', () => {
      let counter = 0;
      const keyArray = [];
      const valueArray = [];
      const object = { one: { two: { string: 'hello' } } };
      const obs = Reactive(object, {
        deep: true,
        onGet: ({ target, key }) => {
          counter += 1;
          keyArray.push(key);
          valueArray.push(target[key]);
        },
      });

      expect(counter).toEqual(0);
      expect(obs.one.two.string).toEqual('hello');
      expect(counter).toEqual(3);
      expect(keyArray).toEqual(['one', 'two', 'string']);
      expect(valueArray).toEqual([{ two: { string: 'hello' } }, { string: 'hello' }, 'hello']);
    });

    it('calls "onSet" hook', () => {
      let counter = 0;
      const keyArray = [];
      const valueArray = [];
      const object = { one: { two: { string: 'hello' } } };
      const obs = Reactive<any>(object, {
        deep: true,
        onSet: ({ key, value }) => {
          counter += 1;
          keyArray.push(key);
          valueArray.push(value);
        },
      });

      expect(counter).toEqual(0);
      obs.one.two.string = 'hello world';
      obs.one = {};
      obs.one.foobar = 'baz';
      expect(obs.one.foobar).toEqual('baz');
      expect(obs.two).toBeUndefined();
      expect(counter).toEqual(3);
      expect(keyArray).toEqual(['string', 'one', 'foobar']);
      expect(valueArray).toEqual(['hello world', { foobar: 'baz' }, 'baz']);
    });
  });
});
