import Observer from '../Observer';
import Reactive from '../Reactive';

describe('object', () => {
  it('busts cache on object set', () => {
    let counter = 0;
    const object = { one: { two: { string: 'foo' } } };
    const tracked = Reactive(object);
    const obs = Observer({
      get: () => {
        counter += 1;

        return tracked.one.two.string;
      },
    });

    expect(obs.value).toEqual('foo');
    expect(obs.value).toEqual('foo');
    expect(counter).toEqual(1);
    tracked.one.two.string = 'hello';
    expect(obs.value).toEqual('hello');
    expect(obs.value).toEqual('hello');
    expect(counter).toEqual(2);
  });

  it('busts cache on object add new property', () => {
    let counter = 0;
    const object = {};
    const tracked = Reactive(object);
    const obs = Observer({
      get: () => {
        counter += 1;

        return tracked.value;
      },
    });

    expect(obs.value).toEqual(undefined);
    expect(obs.value).toEqual(undefined);
    expect(counter).toEqual(1);
    tracked.value = 'hello';
    expect(obs.value).toEqual('hello');
    expect(obs.value).toEqual('hello');
    expect(counter).toEqual(2);
  });

  it('busts cache on object deleteProperty', () => {
    let counter = 0;
    const object = { one: { two: { string: 'foo' } } };
    const tracked = Reactive(object);
    const obs = Observer({
      get: () => {
        counter += 1;

        return tracked.one.two.string;
      },
    });

    expect(obs.value).toEqual('foo');
    expect(obs.value).toEqual('foo');
    expect(counter).toEqual(1);
    delete tracked.one.two.string;
    expect(obs.value).toEqual(undefined);
    expect(obs.value).toEqual(undefined);
    expect(counter).toEqual(2);
  });

  it('busts cache on keys changed "Object.keys()"', () => {
    let counter = 0;
    const object = { one: 'test1' };
    const tracked = Reactive(object);
    const obs = Observer({
      get: () => {
        counter += 1;

        return Object.keys(tracked);
      },
    });

    expect(obs.value).toEqual(['one']);
    expect(obs.value).toEqual(['one']);
    expect(counter).toEqual(1);
    tracked.two = 'test2';
    expect(obs.value).toEqual(['one', 'two']);
    expect(obs.value).toEqual(['one', 'two']);
    expect(counter).toEqual(2);
  });

  it('busts cache on keys changed "Object.keys()" when starting with empty object', () => {
    let counter = 0;
    const object = {};
    const tracked = Reactive(object);
    const obs = Observer({
      get: () => {
        counter += 1;

        return Object.keys(tracked);
      },
    });

    expect(obs.value).toEqual([]);
    expect(obs.value).toEqual([]);
    expect(counter).toEqual(1);
    tracked.test = 'test1';
    expect(obs.value).toEqual(['test']);
    expect(obs.value).toEqual(['test']);
    expect(counter).toEqual(2);
  });

  it('busts cache on keys changed "Object.values()"', () => {
    let counter = 0;
    const object = { one: 'test1' };
    const tracked = Reactive(object);
    const obs = Observer({
      get: () => {
        counter += 1;

        return Object.values(tracked);
      },
    });

    expect(obs.value).toEqual(['test1']);
    expect(obs.value).toEqual(['test1']);
    expect(counter).toEqual(1);
    tracked.two = 'test2';
    expect(obs.value).toEqual(['test1', 'test2']);
    expect(obs.value).toEqual(['test1', 'test2']);
    expect(counter).toEqual(2);
  });

  it('busts cache on keys changed "Object.values()" when starting with empty object', () => {
    let counter = 0;
    const object = {};
    const tracked = Reactive(object);
    const obs = Observer({
      get: () => {
        counter += 1;

        return Object.values(tracked);
      },
    });

    expect(obs.value).toEqual([]);
    expect(obs.value).toEqual([]);
    expect(counter).toEqual(1);
    tracked.test = 'test1';
    expect(obs.value).toEqual(['test1']);
    expect(obs.value).toEqual(['test1']);
    expect(counter).toEqual(2);
  });

  it('busts cache on keys changed "key in target"', () => {
    let counter = 0;
    const object = { one: 'test1' };
    const tracked = Reactive(object);
    const obs = Observer({
      get: () => {
        counter += 1;

        return 'two' in tracked;
      },
    });

    expect(obs.value).toEqual(false);
    expect(obs.value).toEqual(false);
    expect(counter).toEqual(1);
    tracked.two = 'test2';
    expect(obs.value).toEqual(true);
    expect(obs.value).toEqual(true);
    expect(counter).toEqual(2);
  });
});
