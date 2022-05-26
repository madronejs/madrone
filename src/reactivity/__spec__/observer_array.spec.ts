import Observer from '../Observer';
import Reactive from '../Reactive';

describe('array', () => {
  it('busts cache on array set', () => {
    let counter = 0;
    const array = [];
    const tracked = Reactive(array);
    const obs = Observer({
      get: () => {
        counter += 1;

        return tracked[0];
      },
    });

    expect(obs.value).toEqual(undefined);
    expect(obs.value).toEqual(undefined);
    expect(counter).toEqual(1);
    tracked[0] = 'hello';
    expect(obs.value).toEqual('hello');
    expect(obs.value).toEqual('hello');
    expect(counter).toEqual(2);
  });

  it('busts cache on array.push if listening to "length"', () => {
    let counter = 0;
    const array = [];
    const tracked = Reactive(array);
    const obs = Observer({
      get: () => {
        counter += 1;

        return tracked.length ? tracked : [];
      },
    });

    expect(obs.value).toEqual([]);
    expect(obs.value).toEqual([]);
    expect(counter).toEqual(1);
    tracked.push('hello');
    expect(obs.value).toEqual(['hello']);
    expect(obs.value).toEqual(['hello']);
    expect(counter).toEqual(2);
  });

  it('busts cache on array deleteProperty', () => {
    let counter = 0;
    const array = ['baz', 'foo', 'bar'];
    const tracked = Reactive(array);
    const obs = Observer({
      get: () => {
        counter += 1;

        return tracked[2];
      },
    });

    expect(obs.value).toEqual('bar');
    expect(obs.value).toEqual('bar');
    expect(counter).toEqual(1);
    delete tracked[2];
    expect(obs.value).toEqual(undefined);
    expect(obs.value).toEqual(undefined);
    expect(counter).toEqual(2);
  });

  it('busts cache on keys changed "Object.keys()"', () => {
    let counter = 0;
    const array = ['foo', 'bar'];
    const tracked = Reactive(array);
    const obs = Observer({
      get: () => {
        counter += 1;

        return Object.keys(tracked);
      },
    });

    expect(obs.value).toEqual(['0', '1']);
    expect(obs.value).toEqual(['0', '1']);
    expect(counter).toEqual(1);
    tracked.push('baz');
    expect(obs.value).toEqual(['0', '1', '2']);
    expect(obs.value).toEqual(['0', '1', '2']);
    expect(counter).toEqual(2);
  });

  it('busts cache on keys changed "key in target"', () => {
    let counter = 0;
    const object = ['one'];
    const tracked = Reactive(object);
    const obs = Observer({
      get: () => {
        counter += 1;

        return '1' in tracked;
      },
    });

    expect(obs.value).toEqual(false);
    expect(obs.value).toEqual(false);
    expect(counter).toEqual(1);
    tracked.push('two');
    expect(obs.value).toEqual(true);
    expect(obs.value).toEqual(true);
    expect(counter).toEqual(2);
  });

  it('busts cache array.map', () => {
    let counter = 0;
    const object = ['one'];
    const tracked = Reactive(object);
    const obs = Observer({
      get: () => {
        counter += 1;

        return tracked.map((val) => `mapped-${val}`);
      },
    });

    expect(obs.value).toEqual(['mapped-one']);
    expect(obs.value).toEqual(['mapped-one']);
    expect(counter).toEqual(1);
    tracked.push('two');
    expect(obs.value).toEqual(['mapped-one', 'mapped-two']);
    expect(obs.value).toEqual(['mapped-one', 'mapped-two']);
    expect(counter).toEqual(2);
  });

  it('busts cache on array.splice if new array returned', () => {
    let counter = 0;
    const object = ['one', 'two', 'three'];
    const tracked = Reactive(object);
    const obs = Observer({
      get: () => {
        counter += 1;

        return [...tracked];
      },
    });

    expect(obs.value).toEqual(['one', 'two', 'three']);
    expect(obs.value).toEqual(['one', 'two', 'three']);
    expect(counter).toEqual(1);
    tracked.splice(1, 1);
    expect(obs.value).toEqual(['one', 'three']);
    expect(obs.value).toEqual(['one', 'three']);
    expect(counter).toEqual(2);
  });

  it('busts cache while using array.forEach', () => {
    let counter = 0;
    const object = ['one'];
    const tracked = Reactive(object);
    const obs = Observer({
      get: () => {
        counter += 1;

        const obj = {};

        tracked.forEach((val) => {
          obj[val] = true;
        });

        return obj;
      },
    });

    expect(obs.value).toEqual({ one: true });
    expect(obs.value).toEqual({ one: true });
    expect(counter).toEqual(1);
    tracked.push('two');
    expect(obs.value).toEqual({ one: true, two: true });
    expect(obs.value).toEqual({ one: true, two: true });
    expect(counter).toEqual(2);
  });

  it('busts cache when changing value in sub object using array.forEach', () => {
    let counter = 0;
    const array = [{ value: false }, { value: false }];
    const tracked = Reactive(array);
    const obs = Observer({
      get: () => {
        counter += 1;

        let returnVal = false;

        tracked.forEach(({ value }) => {
          if (value) returnVal = true;
        });

        return returnVal;
      },
    });

    expect(obs.value).toEqual(false);
    expect(obs.value).toEqual(false);
    expect(counter).toEqual(1);
    tracked[1].value = true;
    expect(obs.value).toEqual(true);
    expect(obs.value).toEqual(true);
    expect(counter).toEqual(2);
  });

  it('does not bust cache if nested object in array changes', () => {
    let counter = 0;
    const array = [{ value: false }, { value: false }];
    const tracked = Reactive({ array });
    const obs = Observer({
      get: () => {
        counter += 1;

        return tracked.array;
      },
    });

    expect(obs.value).toEqual([{ value: false }, { value: false }]);
    expect(obs.value).toEqual([{ value: false }, { value: false }]);
    expect(counter).toEqual(1);
    tracked.array[1].value = true;
    expect(obs.value).toEqual([{ value: false }, { value: true }]);
    expect(obs.value).toEqual([{ value: false }, { value: true }]);
    expect(counter).toEqual(1);
  });
});
