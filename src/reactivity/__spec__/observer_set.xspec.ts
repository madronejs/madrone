import Observer from '../Observer';
import Reactive from '../Reactive';

describe('set', () => {
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
